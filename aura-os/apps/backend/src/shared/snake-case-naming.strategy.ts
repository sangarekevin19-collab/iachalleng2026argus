import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

export class SnakeCaseNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName || super.tableName(targetName, userSpecifiedName);
  }

  columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    return customName || propertyName.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  relationName(propertyName: string): string {
    return propertyName.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return `${relationName.replace(/([A-Z])/g, '_$1').toLowerCase()}_${referencedColumnName}`;
  }

  joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
    return `${firstTableName}_${secondTableName}`;
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return `${tableName.replace(/([A-Z])/g, '_$1').toLowerCase()}_${columnName || propertyName.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
  }
}
