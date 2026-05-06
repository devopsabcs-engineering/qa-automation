using Microsoft.EntityFrameworkCore;
using OntarioCsc.Web.Models;

namespace OntarioCsc.Web.Data;

public class ServiceRequestContext : DbContext
{
    public ServiceRequestContext(DbContextOptions<ServiceRequestContext> options)
        : base(options)
    {
    }

    public DbSet<ServiceRequest> ServiceRequests => Set<ServiceRequest>();
}
