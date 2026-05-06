using System.ComponentModel.DataAnnotations;

namespace OntarioCsc.Web.Models;

/// <summary>
/// A citizen-submitted request handled by the Ontario Common Service Centre (CSC).
/// </summary>
public class ServiceRequest
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Enter your full name.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Name must be between 2 and 100 characters.")]
    [Display(Name = "Full name")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Enter your email address.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [StringLength(200)]
    [Display(Name = "Email address")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Select a service category.")]
    [Display(Name = "Service category")]
    public ServiceCategory Category { get; set; }

    [Required(ErrorMessage = "Describe your request.")]
    [StringLength(1000, MinimumLength = 10, ErrorMessage = "Description must be between 10 and 1000 characters.")]
    [Display(Name = "Describe your request")]
    public string Description { get; set; } = string.Empty;

    [Display(Name = "Submitted")]
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;

    [Display(Name = "Status")]
    public ServiceRequestStatus Status { get; set; } = ServiceRequestStatus.New;
}

public enum ServiceCategory
{
    [Display(Name = "Driver and vehicle")]
    DriverAndVehicle = 1,

    [Display(Name = "Health card")]
    HealthCard = 2,

    [Display(Name = "Birth, marriage and death")]
    VitalRecords = 3,

    [Display(Name = "Business and economy")]
    Business = 4,

    [Display(Name = "Other")]
    Other = 99,
}

public enum ServiceRequestStatus
{
    New = 0,
    InProgress = 1,
    Completed = 2,
}
