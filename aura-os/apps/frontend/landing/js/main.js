(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();

    // Initiate wowjs
    new WOW().init();

    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 45) {
            $('.navbar').addClass('sticky-top');
        } else {
            $('.navbar').removeClass('sticky-top');
        }
    });

    // Smooth scrolling
    $(".navbar-nav a").on('click', function (event) {
        if (this.hash !== "") {
            event.preventDefault();
            $('html, body').animate({
                scrollTop: $(this.hash).offset().top - 60
            }, 1500, 'easeInOutExpo');
            if ($(this).parents('.navbar-nav').length) {
                $('.navbar-nav .active').removeClass('active');
                $(this).closest('a').addClass('active');
            }
        }
    });

    // Back to top
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo');
        return false;
    });

    // Counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });

    // ============================================
    // AURA OS — Landing → Loading → Redirect Flow
    // ============================================

    // AURA OS Frontend URL (configurable)
    var AURA_OS_URL = localStorage.getItem('aura_os_url') || 'http://localhost:3000';

    // View switcher
    function showView(viewId) {
        $('.aura-view').removeClass('active');
        $('#' + viewId).addClass('active');
        window.scrollTo(0, 0);
    }

    // Commencer button — show loading
    $(document).on('click', '.btn-commencer', function (e) {
        e.preventDefault();
        showView('view-loading');
        startLoading();
    });

    // Se connecter link — go directly to login
    $(document).on('click', '.btn-login', function (e) {
        e.preventDefault();
        window.location.href = AURA_OS_URL + '/auth/login';
    });

    // Loading animation with 30s countdown
    function startLoading() {
        var totalDuration = 30000; // 30 seconds
        var startTime = Date.now();
        var $progressBar = $('#loading-progress-bar');
        var $progressText = $('#loading-percent');
        var $statusText = $('#loading-status');

        // Status messages
        var statuses = [
            { time: 0, msg: 'Initialisation de AURA OS...' },
            { time: 3000, msg: 'Chargement des agents IA...' },
            { time: 7000, msg: 'Configuration de votre environnement...' },
            { time: 12000, msg: 'Connexion au serveur...' },
            { time: 17000, msg: 'Préparation de votre tableau de bord...' },
            { time: 22000, msg: 'Finalisation...' },
            { time: 27000, msg: 'Prêt ! Redirection...' },
        ];

        var statusIndex = 0;

        var interval = setInterval(function () {
            var elapsed = Date.now() - startTime;
            var progress = Math.min((elapsed / totalDuration) * 100, 100);

            // Update progress bar
            $progressBar.css('width', progress + '%');
            $progressText.text(Math.floor(progress) + '%');

            // Update status text
            if (statusIndex < statuses.length && elapsed >= statuses[statusIndex].time) {
                $statusText.text(statuses[statusIndex].msg);
                $statusText.addClass('pulse-text');
                setTimeout(function () { $statusText.removeClass('pulse-text'); }, 500);
                statusIndex++;
            }

            // Complete
            if (elapsed >= totalDuration) {
                clearInterval(interval);
                $progressBar.css('width', '100%');
                $progressText.text('100%');
                $statusText.text('Redirection en cours...');

                // Fade out loading, then redirect
                setTimeout(function () {
                    $('#view-loading').removeClass('active');
                    $('body').addClass('redirecting');
                    setTimeout(function () {
                        window.location.href = AURA_OS_URL + '/auth/register';
                    }, 800);
                }, 500);
            }
        }, 100);
    }

    // Animate loading orbs
    function animateOrbs() {
        $('.loading-orb').each(function (i) {
            var $orb = $(this);
            var delay = i * 0.3;
            $orb.css('animation-delay', delay + 's');
        });
    }

    // Init
    animateOrbs();

    // Double-click on logo → configure AURA OS URL
    var clickTimer = null;
    $('.navbar-brand').on('click', function (e) {
        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
            // Double-click detected → configure URL
            var currentUrl = localStorage.getItem('aura_os_url') || 'http://localhost:3000';
            var newUrl = prompt('URL du frontend AURA OS :', currentUrl);
            if (newUrl) {
                localStorage.setItem('aura_os_url', newUrl);
                alert('URL enregistrée : ' + newUrl);
            }
        } else {
            clickTimer = setTimeout(function () { clickTimer = null; }, 400);
        }
    });

})(jQuery);
