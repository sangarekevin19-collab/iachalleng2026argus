/**
 * AURA OS Backend Patches
 * Applied at container startup to enable LLM-powered onboarding
 */
const fs = require('fs');

// ─── Patch 1: Onboarding Controller — add start/answer/complete/agents routes ───
function patchController() {
    const p = '/app/dist/modules/onboarding/onboarding.controller.js';
    let c = fs.readFileSync(p, 'utf8');

    // Check if already patched
    if (c.includes('async start(req)')) {
        console.log('[PATCH] Controller already patched');
        return;
    }

    // Add methods
    const methods = `
    async start(req) {
        return this.onboardingService.startInterview(req.user.sub, req.user.companyId);
    }
    async answer(req, dto) {
        return this.onboardingService.submitAnswer(req.user.sub, dto.answer, dto.messages || []);
    }
    async complete(req, dto) {
        await this.onboardingService.markComplete(req.user.sub);
        return { success: true, message: 'Onboarding complete' };
    }
    async agents(req) {
        return this.onboardingService.generateAgents(req.user.sub);
    }
`;
    const classEnd = c.lastIndexOf('};');
    if (classEnd > 0) {
        c = c.substring(0, classEnd) + methods + c.substring(classEnd);
    }

    // Add decorators
    const lastDec = `], OnboardingController.prototype, "getByCompany", null);`;
    const newDecs = `], OnboardingController.prototype, "getByCompany", null);
__decorate([
    (0, common_1.Post)('start'),
    (0, swagger_1.ApiOperation)({ summary: 'Start interview' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('answer'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit answer' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "answer", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Complete onboarding' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)('agents'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate AI agents' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "agents", null);`;

    if (c.includes(lastDec)) {
        c = c.replace(lastDec, newDecs);
    }

    fs.writeFileSync(p, c);
    console.log('[PATCH] Controller patched');
}

// ─── Patch 2: Onboarding Service — full LLM service ───
function patchService() {
    const p = '/app/dist/modules/onboarding/onboarding.service.js';
    let c = fs.readFileSync(p, 'utf8');

    if (c.includes('class LLMClient')) {
        console.log('[PATCH] Service already patched');
        return;
    }

    const newService = `"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const onboarding_session_entity_1 = require("./entities/onboarding-session.entity");
const uuid_1 = require("uuid");

class LLMClient {
    apiKey;
    baseUrl = 'https://openrouter.ai/api/v1';
    model = 'nex-agi/nex-n2-pro:free';
    constructor() { this.apiKey = process.env.OPENROUTER_API_KEY || ''; }
    async chat(messages, options = {}) {
        const { temperature = 0.7, maxTokens = 500 } = options;
        try {
            const axios = require('axios');
            const response = await axios.post(this.baseUrl + '/chat/completions',
                { model: this.model, messages, temperature, max_tokens: maxTokens },
                { headers: { 'Authorization': 'Bearer ' + this.apiKey, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://aura-os.com', 'X-Title': 'AURA OS' }, timeout: 60000 }
            );
            return response.data.choices[0].message.content;
        } catch (error) {
            const e = new Error(error.response?.data?.error?.message || error.message);
            e.status = error.response?.status || 0;
            throw e;
        }
    }
}

const llm = new LLMClient();

const INTERVIEW_SYSTEM = 'Tu es AURA, l\\'IA d\\'AURA OS. Entretien approfondi avec un entrepreneur africain. Pose UNE SEULE question a la fois, conversationnelle. Approfondis les reponses vagues. Couvre : activite detaillee, produits/services, clients (qui, combien, comment), equipe (nombre, roles), finances (revenus, depenses, prix), defis quotidiens, objectifs 3-6 mois, outils actuels, besoins automatisation. Minimum 10 questions, maximum 15. Termine avec : INTERVIEW_COMPLETE: [resume detaille 3-4 phrases]. Reponds UNIQUEMENT avec la question suivante.';

const AGENT_SYSTEM = 'Tu es AURA, expert en automatisation d\\'entreprise. Analyse l\\'interview et genere UNIQUEMENT un JSON valide (pas de texte avant/apres, pas de markdown). Structure exacte : {"business_summary":"resume 2-3 phrases","business_type":"hotel","agents":[{"name":"nom francais","description":"desc","category":"operations","priority":10,"tasks":["tache1","tache2","tache3"]}],"dashboard_sections":["overview","bookings","rooms","customers","finance","settings"]}. Regles : 6-12 agents TRES SPECIFIQUES au metier, noms en FRANCAIS, pas d\\'agents generiques comme Assistant General. Adapte TOUT a l\\'interview. Types : hotel|restaurant|commerce|agriculture|transport|clinic|sports|beauty|school|construction|other. Sections : overview|sales|inventory|customers|employees|finance|marketing|delivery|bookings|reviews|suppliers|analytics|pos|whatsapp|reports|settings|players|teams|calendar|communication|appointments|projects|hr|maintenance. JSON UNIQUEMENT.';

let OnboardingService = class OnboardingService {
    onboardingRepository;
    logger = new common_1.Logger('OnboardingService');
    constructor(onboardingRepository) { this.onboardingRepository = onboardingRepository; }

    async findById(id) { return this.onboardingRepository.findOne({ where: { id } }); }
    async findByUser(userId) { return this.onboardingRepository.findOne({ where: { userId } }); }

    async create(userId, companyId) {
        const session = this.onboardingRepository.create({
            id: (0, uuid_1.v4)(), userId, companyId, currentPhase: 'phase_1',
            responses: { _questionIndex: 0, _messages: [], _businessSummary: '', _businessType: '' },
            questions: [], isComplete: false, startedAt: new Date(),
        });
        return this.onboardingRepository.save(session);
    }

    inferBusinessType(text) {
        const t = (text || '').toLowerCase();
        if (t.includes('hotel') || t.includes('chambres') || t.includes('reservation') || t.includes('booking') || t.includes('hebergement')) return 'hotel';
        if (t.includes('restaurant') || t.includes('cuisine') || t.includes('commande') || t.includes('livraison') || t.includes('menu')) return 'restaurant';
        if (t.includes('commerce') || t.includes('boutique') || t.includes('shop') || t.includes('magasin')) return 'commerce';
        if (t.includes('vente') && (t.includes('produit') || t.includes('stock'))) return 'commerce';
        if (t.includes('agriculture') || t.includes('culture') || t.includes('recolte') || t.includes('parcelle') || t.includes('elevage')) return 'agriculture';
        if (t.includes('transport') || t.includes('vehicule') || t.includes('chauffeur') || t.includes('flotte') || t.includes('taxi')) return 'transport';
        if (t.includes('clinic') || t.includes('clinique') || t.includes('patient') || t.includes('medecin') || t.includes('hopital') || t.includes('sante')) return 'clinic';
        if (t.includes('foot') || t.includes('club') || t.includes('sport') || t.includes('joueurs') || t.includes('equipe') || t.includes('match')) return 'sports';
        if (t.includes('beaute') || t.includes('salon') || t.includes('coiffure') || t.includes('esthetique') || t.includes('manucure')) return 'beauty';
        if (t.includes('ecole') || t.includes('education') || t.includes('formation') || t.includes('cours') || t.includes('eleve')) return 'school';
        if (t.includes('construction') || t.includes('btp') || t.includes('chantier') || t.includes('travaux') || t.includes('immobilier')) return 'construction';
        if (t.includes('service') || t.includes('projet') || t.includes('facture') || t.includes('planning') || t.includes('consulting')) return 'service';
        return 'other';
    }

    fallbackQuestion(idx) {
        const q = [
            "Quel type d'entreprise avez-vous (hotel, restaurant, commerce, agriculture, transport, clinique, club sportif, salon beaute, ecole, construction, service) et quels sont vos produits ou services principaux ?",
            "Qui sont vos clients principaux et comment vous trouvent-ils (bouche-a-oreille, Facebook, WhatsApp, Booking, telephone) ?",
            "Combien d'employes avez-vous, quels outils utilisez-vous (Excel, WhatsApp, caisse) et quelles taches prennent le plus de temps ?",
            "Quels sont vos principaux defis : ventes, stock, reservations, comptabilite, personnel, visibilite, concurrence ?",
            "Quels objectifs pour les 3 prochains mois : chiffre d'affaires, clients, taux d'occupation, productivite ?",
            "Avez-vous besoin de sections specifiques : ventes, stock, reservations, chambres, restaurant, clients, finance, marketing, livraisons, avis ?",
            "Quelle automatisation vous ferait gagner le plus de temps des demain ?",
            "Y a-t-il autre chose d'important que je devrais savoir sur votre entreprise ?"
        ];
        return q[Math.min(idx, q.length - 1)];
    }

    buildFallbackAgents(type, summary) {
        const agents = {
            hotel: { business_type: 'hotel', agents: [
                { name: 'Gestion Reservations', description: 'Reservations, confirmations, taux occupation', category: 'operations', priority: 10, tasks: ['Gerer reservations', 'Confirmations', 'Taux occupation', 'Annulations'] },
                { name: 'Gestion Chambres', description: 'Disponibilite, menage, maintenance', category: 'operations', priority: 9, tasks: ['Disponibilite', 'Coordonner menage', 'Alertes maintenance'] },
                { name: 'Reception IA', description: 'Accueil clients et check-in/out', category: 'customer_service', priority: 8, tasks: ['Repondre clients', 'Check-in', 'Relancer avis'] },
                { name: 'Restaurant', description: 'Commandes et performance restaurant', category: 'sales', priority: 7, tasks: ['Commandes', 'Stock bar', 'Promotions'] },
                { name: 'Marketing Avis', description: 'Visibilite et reputation en ligne', category: 'marketing', priority: 7, tasks: ['Offres', 'Relancer avis', 'Campagnes'] },
                { name: 'Comptabilite', description: 'Recettes et depenses', category: 'finance', priority: 6, tasks: ['Recettes', 'Depenses', 'Rapports'] },
            ], dashboard_sections: ['overview','bookings','rooms','customers','finance','reviews','pos','settings'] },
            restaurant: { business_type: 'restaurant', agents: [
                { name: 'Commandes', description: 'Commandes salle et livraison', category: 'sales', priority: 10, tasks: ['Suivre commandes', 'Prioriser cuisine', 'Livraison'] },
                { name: 'Stock Ingredients', description: 'Alertes stocks et pertes', category: 'inventory', priority: 9, tasks: ['Stocks', 'Alertes rupture', 'Achats'] },
                { name: 'Menu Prix', description: 'Rentabilite plats', category: 'analytics', priority: 8, tasks: ['Analyser marges', 'Tops ventes', 'Menus'] },
                { name: 'Livraison', description: 'Livreurs et delais', category: 'delivery', priority: 7, tasks: ['Assigner livreurs', 'Zones', 'Delais'] },
                { name: 'Marketing Local', description: 'Promos et fidelisation', category: 'marketing', priority: 6, tasks: ['WhatsApp', 'Fidelite', 'Promotions'] },
            ], dashboard_sections: ['overview','sales','inventory','delivery','customers','marketing','finance','settings'] },
            commerce: { business_type: 'commerce', agents: [
                { name: 'Gestion Stock', description: 'Stock, alertes, inventaire', category: 'inventory', priority: 10, tasks: ['Suivre stock', 'Alertes rupture', 'Inventaire', 'Reassort'] },
                { name: 'Ventes POS', description: 'Ventes, caisse, marges', category: 'sales', priority: 9, tasks: ['Enregistrer ventes', 'Marges', 'Rapports caisse'] },
                { name: 'Fournisseurs', description: 'Commandes et prix', category: 'suppliers', priority: 8, tasks: ['Commandes', 'Comparer prix', 'Relances'] },
                { name: 'CRM Clients', description: 'Clients et fidelisation', category: 'customers', priority: 7, tasks: ['Suivre clients', 'Relances', 'Fidelite'] },
                { name: 'Comptabilite', description: 'Recettes et factures', category: 'finance', priority: 7, tasks: ['Recettes', 'Depenses', 'Factures'] },
            ], dashboard_sections: ['overview','sales','inventory','customers','suppliers','finance','reports','settings'] },
            sports: { business_type: 'sports', agents: [
                { name: 'Gestion Inscriptions', description: 'Inscriptions nouveaux membres, renouvellements', category: 'operations', priority: 10, tasks: ['Inscriptions en ligne', 'Suivi dossiers', 'Renouvellements', 'Listes attente'] },
                { name: 'Tresorerie Cotisations', description: 'Cotisations, paiements, depenses, budget', category: 'finance', priority: 10, tasks: ['Relances cotisations', 'Suivi paiements', 'Budget saison', 'Rapports financiers'] },
                { name: 'Planification Entrainements', description: 'Planning entrainements, matchs, terrains', category: 'operations', priority: 9, tasks: ['Calendrier', 'Reservation terrain', 'Convoquer membres', 'Planning matchs'] },
                { name: 'Gestion Equipes', description: 'Composition equipes, statistiques, evaluations', category: 'operations', priority: 9, tasks: ['Composition equipes', 'Stats membres', 'Evaluations', 'Suivi absences'] },
                { name: 'Communication Club', description: 'Actualites, reseaux sociaux, evenements', category: 'marketing', priority: 8, tasks: ['Publications reseaux', 'Comptes rendus', 'Recrutement', 'Evenements'] },
            ], dashboard_sections: ['overview','players','teams','finance','calendar','communication','settings'] },
            beauty: { business_type: 'beauty', agents: [
                { name: 'Prise de Rendez-vous', description: 'Gestion RDV, rappels clients, planning', category: 'operations', priority: 10, tasks: ['Prise RDV en ligne', 'Rappels SMS', 'Gestion planning', 'Annulations'] },
                { name: 'Fidelisation Clientes', description: 'Programme fidelite, offres, preferences', category: 'customer_service', priority: 9, tasks: ['Programme fidelite', 'Offres anniversaire', 'Suivi preferences', 'Relances'] },
                { name: 'Gestion Produits', description: 'Stock produits, commandes fournisseurs', category: 'inventory', priority: 8, tasks: ['Suivre stock', 'Alertes rupture', 'Commandes', 'Inventaire'] },
                { name: 'Comptabilite Salon', description: 'Recettes, depenses, salaires, rapports', category: 'finance', priority: 7, tasks: ['Recettes quotidiennes', 'Depenses', 'Salaires', 'Rapports'] },
            ], dashboard_sections: ['overview','appointments','customers','inventory','finance','marketing','settings'] },
            school: { business_type: 'school', agents: [
                { name: 'Inscriptions Admissions', description: 'Inscriptions, dossiers eleves, certificats', category: 'operations', priority: 10, tasks: ['Inscriptions', 'Dossiers eleves', 'Certificats', 'Listes classes'] },
                { name: 'Tresorerie Scolaire', description: 'Frais scolarite, paiements, budget', category: 'finance', priority: 10, tasks: ['Frais scolarite', 'Relances paiements', 'Budget', 'Rapports'] },
                { name: 'Planification Cours', description: 'Emploi du temps, salles, examens', category: 'operations', priority: 9, tasks: ['Emploi du temps', 'Reservation salles', 'Planning examens', 'Remplacements'] },
                { name: 'Communication Parents', description: 'Bulletins, reunions, annonces', category: 'customer_service', priority: 8, tasks: ['Bulletins notes', 'Reunions parents', 'Annonces', 'Absences'] },
            ], dashboard_sections: ['overview','students','teachers','finance','calendar','communication','settings'] },
            agriculture: { business_type: 'agriculture', agents: [
                { name: 'Suivi Cultures', description: 'Parcelles et rendements', category: 'operations', priority: 10, tasks: ['Parcelles', 'Traitements', 'Rendements'] },
                { name: 'Irrigation Meteo', description: 'Meteo et irrigation', category: 'analytics', priority: 8, tasks: ['Previsions', 'Plan irrigation', 'Alertes'] },
                { name: 'Recolte Stock', description: 'Recoltes et stockage', category: 'inventory', priority: 8, tasks: ['Planifier recolte', 'Stock', 'Pertes'] },
                { name: 'Vente Produits', description: 'Acheteurs et prix', category: 'sales', priority: 7, tasks: ['Acheteurs', 'Prix marche', 'Commandes'] },
            ], dashboard_sections: ['overview','crops','weather','irrigation','harvest','inventory','sales','settings'] },
            transport: { business_type: 'transport', agents: [
                { name: 'Reservations', description: 'Reservations et paiements', category: 'sales', priority: 10, tasks: ['Reservations', 'Confirmations', 'Paiements'] },
                { name: 'Flotte', description: 'Vehicules et affectations', category: 'operations', priority: 9, tasks: ['Vehicules', 'Affectations', 'Carburant'] },
                { name: 'Chauffeurs', description: 'Planning et performance', category: 'hr', priority: 8, tasks: ['Planning', 'Performance', 'Pauses'] },
                { name: 'Maintenance', description: 'Entretien et pannes', category: 'operations', priority: 7, tasks: ['Entretien', 'Pannes', 'Couts'] },
                { name: 'Itineraires', description: 'Optimisation trajets', category: 'analytics', priority: 7, tasks: ['Optimiser trajets', 'Retards', 'Zones'] },
            ], dashboard_sections: ['overview','bookings','fleet','drivers','maintenance','routes','finance','settings'] },
            clinic: { business_type: 'clinic', agents: [
                { name: 'Rendez-vous', description: 'Planning et rappels', category: 'operations', priority: 10, tasks: ['RDV', 'Rappels SMS', 'Files attente'] },
                { name: 'Dossiers Patients', description: 'Historique et consultations', category: 'customers', priority: 9, tasks: ['Historique', 'Consultations', 'Suivi'] },
                { name: 'Pharmacie', description: 'Stock medicaments', category: 'inventory', priority: 8, tasks: ['Stock medicaments', 'Ordonnances', 'Alertes'] },
                { name: 'Facturation', description: 'Paiements et assurances', category: 'finance', priority: 7, tasks: ['Facturation', 'Assurances', 'Paiements'] },
            ], dashboard_sections: ['overview','appointments','patients','pharmacy','billing','insurance','reports','settings'] },
            construction: { business_type: 'construction', agents: [
                { name: 'Gestion Chantiers', description: 'Suivi chantiers, etapes, delais', category: 'operations', priority: 10, tasks: ['Suivi chantiers', 'Planning travaux', 'Delais', 'Coordination'] },
                { name: 'Budget Devis', description: 'Devis, budgets, facturation', category: 'finance', priority: 10, tasks: ['Creer devis', 'Suivre budgets', 'Facturation', 'Rapports couts'] },
                { name: 'Gestion Materiaux', description: 'Stock materiaux, commandes', category: 'inventory', priority: 8, tasks: ['Stock materiaux', 'Commandes fournisseurs', 'Alertes stock', 'Inventaire'] },
                { name: 'RH Chantier', description: 'Ouvriers, planning, paie', category: 'hr', priority: 7, tasks: ['Gestion ouvriers', 'Planning equipes', 'Paie', 'Presence'] },
            ], dashboard_sections: ['overview','projects','finance','inventory','hr','settings'] },
            other: { business_type: 'other', agents: [
                { name: 'Gestion Operations', description: 'Organisation quotidienne, taches, suivi', category: 'operations', priority: 10, tasks: ['Organiser taches', 'Suivi projets', 'Rappels', 'Planification'] },
                { name: 'Gestion Clients', description: 'Relation client, suivi, reclamations', category: 'customer_service', priority: 9, tasks: ['Suivre clients', 'Relances', 'Reclamations', 'Fidelisation'] },
                { name: 'Comptabilite', description: 'Recettes, depenses, factures', category: 'finance', priority: 8, tasks: ['Recettes', 'Depenses', 'Factures', 'Rapports'] },
                { name: 'Marketing Digital', description: 'Reseaux sociaux, promotion, visibilite', category: 'marketing', priority: 7, tasks: ['Reseaux sociaux', 'Promotions', 'Contenu', 'Avis'] },
            ], dashboard_sections: ['overview','sales','customers','finance','analytics','settings'] }
        };
        const cfg = agents[type] || agents.other;
        return { business_summary: summary || 'Entreprise', business_type: cfg.business_type, agents: cfg.agents, dashboard_sections: cfg.dashboard_sections };
    }

    async startInterview(userId, companyId) {
        let session = await this.findByUser(userId);
        if (!session) session = await this.create(userId, companyId);
        session.responses = { _questionIndex: 0, _messages: [], _businessSummary: '', _businessType: '' };
        session.questions = []; session.isComplete = false; session.currentPhase = 'phase_1';
        await this.onboardingRepository.save(session);
        let firstQuestion;
        try {
            firstQuestion = await llm.chat([
                { role: 'system', content: INTERVIEW_SYSTEM },
                { role: 'user', content: "Commence l'interview. Pose la premiere question." }
            ]);
        } catch (error) {
            this.logger.error('Start LLM error: ' + error.message);
            firstQuestion = this.fallbackQuestion(0);
        }
        return { sessionId: session.id, firstQuestion, questionIndex: 0 };
    }

    async submitAnswer(userId, answer, messages) {
        const session = await this.findByUser(userId);
        if (!session) throw new common_1.NotFoundException('Session not found');
        const responses = session.responses || {};
        const questionIndex = responses._questionIndex || 0;
        const history = responses._messages || [];
        history.push({ role: 'user', content: answer });
        const conversation = [{ role: 'system', content: INTERVIEW_SYSTEM }, ...history.map(m => ({ role: m.role, content: m.content }))];
        let llmResponse;
        let usedFallback = false;
        try {
            llmResponse = await llm.chat(conversation);
        } catch (error) {
            this.logger.error('Answer LLM error: ' + error.message);
            if (questionIndex >= 7) {
                const bt = this.inferBusinessType(history.map(m => m.content).join(' '));
                const sum = 'Entreprise analysee. Type: ' + bt + '. ' + answer.substring(0, 200);
                responses._businessSummary = sum;
                responses._businessType = bt;
                history.push({ role: 'assistant', content: 'Merci, j ai maintenant assez d informations pour configurer votre espace.' });
                await this.onboardingRepository.update(session.id, {
                    responses: { ...responses, _messages: history, _questionIndex: questionIndex + 1 },
                    questions: [...(session.questions || []), { question: 'Interview complete', answer }],
                    isComplete: true, currentPhase: 'completed',
                });
                return { isComplete: true, summary: sum, responses };
            }
            llmResponse = this.fallbackQuestion(questionIndex + 1);
            usedFallback = true;
        }
        const isComplete = !usedFallback && llmResponse.startsWith('INTERVIEW_COMPLETE');
        if (isComplete) {
            const summary = llmResponse.replace('INTERVIEW_COMPLETE:', '').trim();
            responses._businessSummary = summary;
            history.push({ role: 'assistant', content: summary });
            await this.onboardingRepository.update(session.id, {
                responses: { ...responses, _messages: history, _questionIndex: questionIndex + 1 },
                questions: [...(session.questions || []), { question: 'Interview complete', answer }],
                isComplete: true, currentPhase: 'completed',
            });
            return { isComplete: true, summary, responses };
        }
        history.push({ role: 'assistant', content: llmResponse });
        await this.onboardingRepository.update(session.id, {
            responses: { ...responses, _messages: history, _questionIndex: questionIndex + 1 },
            questions: [...(session.questions || []), { question: llmResponse, answer }],
            currentPhase: 'phase_1',
        });
        return { isComplete: false, nextQuestion: llmResponse, questionIndex: questionIndex + 1, responses };
    }

    async generateAgents(userId) {
        const session = await this.findByUser(userId);
        if (!session) throw new common_1.NotFoundException('Session not found');
        const responses = session.responses || {};
        const summary = responses._businessSummary || '';
        const questions = session.questions || [];
        const transcript = questions.map(q => 'Q: ' + q.question + '\\nA: ' + q.answer).join('\\n\\n');
        const fullContext = 'Resume: ' + summary + '\\n\\nTranscript:\\n' + transcript;
        try {
            const llmResponse = await llm.chat([
                { role: 'system', content: AGENT_SYSTEM },
                { role: 'user', content: fullContext }
            ], { temperature: 0.3, maxTokens: 3000 });
            this.logger.log('Agents LLM: ' + llmResponse.substring(0, 300));
            let jsonStr = llmResponse.trim().replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').replace(/\`/g, '');
            const start = jsonStr.indexOf('{');
            const end = jsonStr.lastIndexOf('}');
            if (start >= 0 && end > start) {
                jsonStr = jsonStr.substring(start, end + 1).replace(/,\\s*}/g, '}').replace(/,\\s*]/g, ']');
                try {
                    const result = JSON.parse(jsonStr);
                    if (result.business_type) {
                        session.responses._businessType = result.business_type;
                        await this.onboardingRepository.update(session.id, { responses: session.responses });
                    }
                    return result;
                } catch (pe) { this.logger.error('JSON parse: ' + pe.message); }
            }
            throw new Error('No valid JSON');
        } catch (error) {
            this.logger.error('Agents error: ' + error.message);
            const bt = responses._businessType || this.inferBusinessType(transcript);
            return this.buildFallbackAgents(bt, summary);
        }
    }

    async markComplete(userId) {
        const session = await this.findByUser(userId);
        if (!session) throw new common_1.NotFoundException('Session not found');
        await this.onboardingRepository.update(session.id, { isComplete: true, completedAt: new Date(), currentPhase: 'completed' });
        return this.findById(session.id);
    }

    async getByCompany(companyId) { return this.onboardingRepository.find({ where: { companyId }, order: { createdAt: 'DESC' } }); }

    async updateResponses(id, questionKey, answer) {
        const session = await this.findById(id);
        session.responses = { ...session.responses, [questionKey]: answer };
        return this.onboardingRepository.save(session);
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(onboarding_session_entity_1.OnboardingSession)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], OnboardingService);
`;

    fs.writeFileSync(p, newService);
    console.log('[PATCH] Service patched');
}

// ─── Apply all patches ───
try {
    patchController();
    patchService();
    console.log('[PATCH] All patches applied successfully');
} catch (error) {
    console.error('[PATCH] Error:', error.message);
    process.exit(1);
}
