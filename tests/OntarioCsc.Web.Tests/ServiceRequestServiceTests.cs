using Microsoft.EntityFrameworkCore;
using OntarioCsc.Web.Data;
using OntarioCsc.Web.Models;
using OntarioCsc.Web.Services;

namespace OntarioCsc.Web.Tests;

/// <summary>
/// Unit tests for <see cref="ServiceRequestService"/>. The service is exercised
/// against an EF Core in-memory database that gets a unique name per test, so
/// each test is fully isolated.
/// </summary>
public class ServiceRequestServiceTests
{
    private static ServiceRequestContext CreateContext(string? name = null)
    {
        var options = new DbContextOptionsBuilder<ServiceRequestContext>()
            .UseInMemoryDatabase(name ?? Guid.NewGuid().ToString())
            .Options;
        return new ServiceRequestContext(options);
    }

    private static ServiceRequest BuildValidRequest(string? name = "Pat Citizen") => new()
    {
        FullName = name ?? "Pat Citizen",
        Email = "pat.citizen@example.on.ca",
        Category = ServiceCategory.HealthCard,
        Description = "Replacement health card requested.",
    };

    [Fact]
    public async Task GetAllAsync_NoRequests_ReturnsEmpty()
    {
        using var context = CreateContext();
        var service = new ServiceRequestService(context);

        var result = await service.GetAllAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task CreateAsync_AssignsId_StatusIsNew_AndPersists()
    {
        using var context = CreateContext();
        var service = new ServiceRequestService(context);

        var created = await service.CreateAsync(BuildValidRequest());

        Assert.True(created.Id > 0);
        Assert.Equal(ServiceRequestStatus.New, created.Status);
        Assert.True(created.SubmittedAt <= DateTimeOffset.UtcNow);
        Assert.True(created.SubmittedAt >= DateTimeOffset.UtcNow.AddMinutes(-1));

        Assert.Equal(1, await context.ServiceRequests.CountAsync());
    }

    [Fact]
    public async Task CreateAsync_NullRequest_Throws()
    {
        using var context = CreateContext();
        var service = new ServiceRequestService(context);

        await Assert.ThrowsAsync<ArgumentNullException>(() => service.CreateAsync(null!));
    }

    [Fact]
    public async Task GetAllAsync_ReturnsResultsOrderedByMostRecent()
    {
        using var context = CreateContext();
        var service = new ServiceRequestService(context);

        var older = BuildValidRequest("Older Citizen");
        var newer = BuildValidRequest("Newer Citizen");

        await service.CreateAsync(older);
        // Force a small ordering delta so we exercise the OrderByDescending path.
        await Task.Delay(10);
        await service.CreateAsync(newer);

        var results = await service.GetAllAsync();

        Assert.Equal(2, results.Count);
        Assert.Equal("Newer Citizen", results[0].FullName);
        Assert.Equal("Older Citizen", results[1].FullName);
    }

    [Fact]
    public async Task GetByIdAsync_UnknownId_ReturnsNull()
    {
        using var context = CreateContext();
        var service = new ServiceRequestService(context);

        var result = await service.GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByIdAsync_KnownId_ReturnsRequest()
    {
        using var context = CreateContext();
        var service = new ServiceRequestService(context);

        var saved = await service.CreateAsync(BuildValidRequest());

        var result = await service.GetByIdAsync(saved.Id);

        Assert.NotNull(result);
        Assert.Equal(saved.Id, result!.Id);
        Assert.Equal("Pat Citizen", result.FullName);
    }

    [Fact]
    public async Task UpdateStatusAsync_KnownId_UpdatesStatus_ReturnsTrue()
    {
        using var context = CreateContext();
        var service = new ServiceRequestService(context);

        var saved = await service.CreateAsync(BuildValidRequest());

        var success = await service.UpdateStatusAsync(saved.Id, ServiceRequestStatus.Completed);

        Assert.True(success);
        var refreshed = await service.GetByIdAsync(saved.Id);
        Assert.NotNull(refreshed);
        Assert.Equal(ServiceRequestStatus.Completed, refreshed!.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_UnknownId_ReturnsFalse()
    {
        using var context = CreateContext();
        var service = new ServiceRequestService(context);

        var success = await service.UpdateStatusAsync(42, ServiceRequestStatus.Completed);

        Assert.False(success);
    }

    [Fact]
    public void Seeder_OnEmptyContext_AddsExpectedRows()
    {
        using var context = CreateContext();

        ServiceRequestSeeder.EnsureSeeded(context);

        Assert.Equal(2, context.ServiceRequests.Count());
    }

    [Fact]
    public void Seeder_DoesNotDuplicateOnSecondCall()
    {
        using var context = CreateContext();

        ServiceRequestSeeder.EnsureSeeded(context);
        ServiceRequestSeeder.EnsureSeeded(context);

        Assert.Equal(2, context.ServiceRequests.Count());
    }
}
