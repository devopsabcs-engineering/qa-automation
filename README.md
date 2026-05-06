# Ontario CSC — QA automation workshop sample

A small ASP.NET Core 10 sample application styled after the [Ontario Design System](https://designsystem.ontario.ca) for the Government of Ontario **Common Service Centre (CSC)** cluster QA automation workshops. The app exists so participants have a real, deployable target to write automated tests against — first .NET unit tests, and later [Playwright](https://playwright.dev) end-to-end tests that flow back into Azure DevOps work items and test plans.

The sibling repo [`Playwright101`](../Playwright101/README.md) contains the workshop curriculum that uses this app as the system under test.

> **Workshop demo only.** Data is held in an in-memory database and is wiped on every restart. Do not enter real personal information.

## Why this app exists

| Goal | How it is met |
|------|---------------|
| Familiar Government of Ontario look and feel | Hand-written CSS that mirrors the public Ontario Design System tokens (yellow accent bar, Open Sans, callouts, badges). Easy to swap in the official ODS distribution package. |
| Simple to run anywhere | ASP.NET Core 10 Razor Pages, Kestrel only, EF Core in-memory database — no SQL, no migrations, no secrets. |
| Simple to deploy | Single `dotnet publish` artifact deployable to an Azure App Service for Linux. |
| Workshop-ready test pyramid | xUnit unit tests, EF Core service tests, ASP.NET Core integration smoke tests; Playwright slots in beside them later. |
| Tests tab populated in Azure DevOps | `azure-pipelines.yml` runs `dotnet test` with the `trx` logger and lets `DotNetCoreCLI@2` publish results — they appear automatically in the **Tests** tab. |
| Traceability into ADO work items | Commit messages use `AB#{id}` linking; see [`.github/instructions/ado-workflow.instructions.md`](.github/instructions/ado-workflow.instructions.md). |

## Stack

| Layer | Choice |
|------|--------|
| Runtime | .NET 10 (`net10.0`) |
| Web framework | ASP.NET Core Razor Pages |
| Persistence | EF Core in-memory provider (`Microsoft.EntityFrameworkCore.InMemory`) |
| Tests | xUnit + `Microsoft.AspNetCore.Mvc.Testing` |
| CI/CD | Azure Pipelines (`azure-pipelines.yml`) |
| Hosting target | Azure App Service for Linux (DOTNETCORE 10.0) |
| Front-end | Hand-written Ontario-themed CSS at `src/OntarioCsc.Web/wwwroot/css/ontario.css` |

## Repository layout

```text
qa-automation/
├── azure-pipelines.yml                Azure DevOps pipeline (build, test, publish, optional deploy)
├── global.json                        Pinned .NET SDK version
├── OntarioCsc.slnx                    Solution file
├── README.md                          This file
├── src/
│   └── OntarioCsc.Web/                ASP.NET Core 10 Razor Pages app
│       ├── Data/                      EF Core DbContext + seed data
│       ├── Models/                    ServiceRequest domain model
│       ├── Services/                  IServiceRequestService + implementation
│       ├── Pages/                     Razor Pages (Index, Privacy, Requests/Index, Requests/New)
│       ├── Pages/Shared/_Layout.cshtml  Ontario-themed layout
│       └── wwwroot/css/ontario.css    Ontario Design System styling
└── tests/
    └── OntarioCsc.Web.Tests/          xUnit test project
        ├── ServiceRequestServiceTests.cs       EF Core service unit tests
        ├── ServiceRequestValidationTests.cs    Data-annotation validation tests
        └── WebHostSmokeTests.cs                Integration tests via WebApplicationFactory
```

## Run it locally

Prerequisites: [.NET 10 SDK](https://dotnet.microsoft.com/download).

```powershell
cd qa-automation
dotnet build OntarioCsc.slnx
dotnet run --project src/OntarioCsc.Web
```

Then browse to `http://localhost:5158` (the URL is printed by `dotnet run`).

The app boots with two seeded service requests so the **Requests** page is never empty.

## Run the tests

```powershell
cd qa-automation
dotnet test OntarioCsc.slnx
```

Today there are 23 tests across three suites:

| Suite | Focus |
|------|-------|
| `ServiceRequestServiceTests` | EF Core in-memory database behaviour through `IServiceRequestService` (CRUD, ordering, status updates, seeding). |
| `ServiceRequestValidationTests` | Data-annotation rules on the `ServiceRequest` model (these are the same rules the form binds to). |
| `WebHostSmokeTests` | End-to-end smoke through `WebApplicationFactory<Program>` to confirm every page returns 200 and renders Ontario markup. |

## Azure DevOps pipeline

`azure-pipelines.yml` defines two stages:

1. **Build & Test** (`Build` stage)
   * Installs .NET 10, restores, builds, and runs `dotnet test` with the `trx` logger.
   * `DotNetCoreCLI@2` with `command: 'test'` publishes the `.trx` file automatically — that is what populates the **Tests** tab on the run summary in Azure DevOps.
   * Collects code coverage (`--collect:"XPlat Code Coverage"`) and publishes the Cobertura report so it appears under the **Code Coverage** tab.
   * Runs `dotnet publish` and uploads the zipped output as the `web` pipeline artifact.

2. **Deploy to Azure App Service** (`Deploy` stage, gated)
   * Disabled by default. Set the pipeline variable `DeployToAppService` to `true` and supply `azureServiceConnection`, `appServiceName`, and `appServiceResourceGroup`. Then it downloads the `web` artifact and runs `AzureWebApp@1` against the named App Service.

To create the pipeline:

1. Push this folder to a Git repository in the `MngEnvMCAP675646/Playwright101` Azure DevOps project.
2. **Pipelines → New pipeline → Azure Repos Git → Existing Azure Pipelines YAML file → `/qa-automation/azure-pipelines.yml`**.
3. Run it. After the first successful run, click **Tests** on the run summary to see the 23 unit tests reported.

### Adding Playwright results to the same Tests tab

Once the workshop adds a Playwright project (see `playwright-tests/` in the sibling repo), append a step like the one below to the same job. Playwright's JUnit reporter produces XML that the **PublishTestResults@2** task surfaces in the same Tests tab alongside the .NET tests.

```yaml
- script: |
    cd playwright-tests
    npm ci
    npx playwright install --with-deps chromium
    npx playwright test --reporter=junit --output=test-results
  displayName: 'Run Playwright tests'

- task: PublishTestResults@2
  displayName: 'Publish Playwright test results'
  condition: succeededOrFailed()
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'playwright-tests/test-results/*.xml'
    testRunTitle: 'Playwright (Chromium)'
```

## Deploy to Azure App Service (one-time setup)

The pipeline assumes a Linux App Service running the .NET 10 stack. Quick provisioning with the Azure CLI:

```powershell
$rg   = 'rg-ontario-csc-dev-cac'
$plan = 'asp-ontario-csc-dev-cac'
$app  = 'app-ontario-csc-dev-cac'   # must be globally unique
$loc  = 'canadacentral'

az group create --name $rg --location $loc
az appservice plan create --name $plan --resource-group $rg --sku B1 --is-linux
az webapp create --name $app --plan $plan --resource-group $rg --runtime 'DOTNETCORE:10.0'
```

Then in Azure DevOps:

1. Create an **Azure Resource Manager** service connection pointing at the subscription.
2. Set pipeline variables `DeployToAppService=true`, `azureServiceConnection`, `appServiceName=$app`, `appServiceResourceGroup=$rg`.
3. Re-run the pipeline. The `Deploy` stage will run after `Build`.

## Linking work back to Azure DevOps

The Azure DevOps work item, branching, commit, and test traceability rules for this workshop live in [`.github/instructions/ado-workflow.instructions.md`](.github/instructions/ado-workflow.instructions.md). Highlights:

* Branch per work item: `feature/{id}-short-description`.
* Commit messages include `AB#{id}` so commits attach to the User Story or Bug.
* Test Cases must be linked to User Stories with the `Tests` link type so the **Test coverage** widget in ADO lights up.

## Roadmap (not yet implemented)

These are intentionally out of scope for the first iteration to keep the demo simple:

* Vendor the official Ontario Design System distribution package under `src/OntarioCsc.Web/wwwroot/vendor/ontario-design-system/` and reference `ds-theme.min.css` instead of the hand-written CSS. The `wwwroot/vendor/` path is already in `.gitignore`.
* Add a `playwright-tests/` project that talks to the deployed App Service URL.
* Wire Playwright test runs into the same pipeline (snippet above).
* Persist requests to a real database (Azure SQL or PostgreSQL) once the workshop covers configuration and secrets.