using OntarioCsc.Web.Models;

namespace OntarioCsc.Web.Services;

public interface IServiceRequestService
{
    Task<IReadOnlyList<ServiceRequest>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<ServiceRequest?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<ServiceRequest> CreateAsync(ServiceRequest request, CancellationToken cancellationToken = default);

    Task<bool> UpdateStatusAsync(int id, ServiceRequestStatus status, CancellationToken cancellationToken = default);
}
