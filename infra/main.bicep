// =====================================================================
// Ontario CSC sample app - infrastructure
// ---------------------------------------------------------------------
// Provisions the minimal Azure footprint the CI/CD pipeline needs:
//   * Linux App Service Plan (Basic tier by default)
//   * Linux Web App configured for the .NET 10 runtime
//
// Designed to be deployed at resource group scope from the pipeline:
//   az deployment group create \
//     --resource-group <rg> \
//     --template-file infra/main.bicep \
//     --parameters appServiceName=<globally-unique-name>
// =====================================================================

targetScope = 'resourceGroup'

@description('Azure region for all resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Globally unique name of the Azure Web App (3-60 chars, lowercase letters, numbers, hyphens).')
@minLength(3)
@maxLength(60)
param appServiceName string

@description('Name of the App Service Plan. Defaults to "asp-<appServiceName>".')
param appServicePlanName string = 'asp-${appServiceName}'

@description('App Service Plan SKU. B1 is the cheapest tier that supports custom domains and SSL.')
@allowed([
  'B1'
  'B2'
  'S1'
  'S2'
  'P0v3'
  'P1v3'
])
param sku string = 'B1'

@description('Linux runtime stack for the Web App. Matches the runtime used by AzureWebApp@1 in the pipeline.')
param linuxFxVersion string = 'DOTNETCORE|10.0'

@description('Tags applied to every resource for traceability.')
param tags object = {
  workload: 'ontario-csc'
  environment: 'dev'
  managedBy: 'bicep'
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: sku
  }
  kind: 'linux'
  properties: {
    reserved: true // required for Linux plans
  }
}

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: appServiceName
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      alwaysOn: false // keep cost low on B1; flip to true for production SKUs
    }
  }
}

@description('Name of the deployed Web App.')
output webAppName string = site.name

@description('Default HTTPS hostname of the deployed Web App.')
output webAppUrl string = 'https://${site.properties.defaultHostName}'

@description('Resource ID of the App Service Plan.')
output appServicePlanId string = plan.id
