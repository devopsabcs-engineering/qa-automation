using System.ComponentModel.DataAnnotations;
using OntarioCsc.Web.Models;

namespace OntarioCsc.Web.Tests;

/// <summary>
/// Validation rule tests for <see cref="ServiceRequest"/> data annotations.
/// These tests document the contract used by the Razor Page form so that any
/// future change to validation rules surfaces as a failing test.
/// </summary>
public class ServiceRequestValidationTests
{
    private static IList<ValidationResult> Validate(ServiceRequest request)
    {
        var ctx = new ValidationContext(request);
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(request, ctx, results, validateAllProperties: true);
        return results;
    }

    private static ServiceRequest ValidRequest() => new()
    {
        FullName = "Pat Citizen",
        Email = "pat@example.on.ca",
        Category = ServiceCategory.DriverAndVehicle,
        Description = "Need to renew my driver's licence please.",
    };

    [Fact]
    public void ValidRequest_PassesValidation()
    {
        var errors = Validate(ValidRequest());

        Assert.Empty(errors);
    }

    [Theory]
    [InlineData("")]
    [InlineData("A")]
    public void FullName_TooShortOrEmpty_FailsValidation(string name)
    {
        var request = ValidRequest();
        request.FullName = name;

        var errors = Validate(request);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(ServiceRequest.FullName)));
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("@example.com")]
    [InlineData("")]
    public void Email_Invalid_FailsValidation(string email)
    {
        var request = ValidRequest();
        request.Email = email;

        var errors = Validate(request);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(ServiceRequest.Email)));
    }

    [Fact]
    public void Description_TooShort_FailsValidation()
    {
        var request = ValidRequest();
        request.Description = "short";

        var errors = Validate(request);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(ServiceRequest.Description)));
    }

    [Fact]
    public void Description_WayTooLong_FailsValidation()
    {
        var request = ValidRequest();
        request.Description = new string('x', 1001);

        var errors = Validate(request);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(ServiceRequest.Description)));
    }
}
