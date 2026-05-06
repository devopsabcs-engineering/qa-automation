using Microsoft.EntityFrameworkCore;
using OntarioCsc.Web.Data;
using OntarioCsc.Web.Models;

namespace OntarioCsc.Web.Services;

public class ServiceRequestService : IServiceRequestService
{
    private readonly ServiceRequestContext _context;

    public ServiceRequestService(ServiceRequestContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<ServiceRequest>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.ServiceRequests
            .AsNoTracking()
            .OrderByDescending(r => r.SubmittedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<ServiceRequest?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.ServiceRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<ServiceRequest> CreateAsync(ServiceRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        request.SubmittedAt = DateTimeOffset.UtcNow;
        request.Status = ServiceRequestStatus.New;

        _context.ServiceRequests.Add(request);
        await _context.SaveChangesAsync(cancellationToken);
        return request;
    }

    public async Task<bool> UpdateStatusAsync(int id, ServiceRequestStatus status, CancellationToken cancellationToken = default)
    {
        var existing = await _context.ServiceRequests.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (existing is null)
        {
            return false;
        }

        existing.Status = status;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
