using OntarioCsc.Web.Models;

namespace OntarioCsc.Web.Data;

public static class ServiceRequestSeeder
{
    public static void EnsureSeeded(ServiceRequestContext context)
    {
        if (context.ServiceRequests.Any())
        {
            return;
        }

        context.ServiceRequests.AddRange(
            new ServiceRequest
            {
                FullName = "Pat Citizen",
                Email = "pat.citizen@example.on.ca",
                Category = ServiceCategory.DriverAndVehicle,
                Description = "Need to renew my driver's licence and update my address.",
                SubmittedAt = DateTimeOffset.UtcNow.AddDays(-3),
                Status = ServiceRequestStatus.InProgress,
            },
            new ServiceRequest
            {
                FullName = "Alex Resident",
                Email = "alex.resident@example.on.ca",
                Category = ServiceCategory.HealthCard,
                Description = "Lost my health card and would like to request a replacement.",
                SubmittedAt = DateTimeOffset.UtcNow.AddDays(-1),
                Status = ServiceRequestStatus.New,
            });

        context.SaveChanges();
    }
}
