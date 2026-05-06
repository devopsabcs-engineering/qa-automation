using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using OntarioCsc.Web.Models;
using OntarioCsc.Web.Services;

namespace OntarioCsc.Web.Pages.Requests;

public class NewModel : PageModel
{
    private readonly IServiceRequestService _service;

    public NewModel(IServiceRequestService service)
    {
        _service = service;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string? SubmittedReference { get; private set; }

    public IEnumerable<SelectListItem> CategoryOptions =>
        Enum.GetValues<ServiceCategory>()
            .Select(c => new SelectListItem
            {
                Value = ((int)c).ToString(),
                Text = GetDisplayName(c),
            });

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync(CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var request = new ServiceRequest
        {
            FullName = Input.FullName.Trim(),
            Email = Input.Email.Trim(),
            Category = Input.Category!.Value,
            Description = Input.Description.Trim(),
        };

        var saved = await _service.CreateAsync(request, cancellationToken);
        SubmittedReference = $"CSC-{saved.Id:D5}";
        ModelState.Clear();
        Input = new InputModel();
        return Page();
    }

    private static string GetDisplayName(ServiceCategory category)
    {
        var member = typeof(ServiceCategory).GetMember(category.ToString()).FirstOrDefault();
        var attr = member?.GetCustomAttribute<DisplayAttribute>();
        return attr?.Name ?? category.ToString();
    }

    public class InputModel
    {
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
        public ServiceCategory? Category { get; set; }

        [Required(ErrorMessage = "Describe your request.")]
        [StringLength(1000, MinimumLength = 10, ErrorMessage = "Description must be between 10 and 1000 characters.")]
        [Display(Name = "Describe your request")]
        public string Description { get; set; } = string.Empty;
    }
}
