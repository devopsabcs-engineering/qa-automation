using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Microsoft.AspNetCore.Mvc.RazorPages;
using OntarioCsc.Web.Models;
using OntarioCsc.Web.Services;

namespace OntarioCsc.Web.Pages.Requests;

public class IndexModel : PageModel
{
    private readonly IServiceRequestService _service;

    public IndexModel(IServiceRequestService service)
    {
        _service = service;
    }

    public IReadOnlyList<ServiceRequest> Requests { get; private set; } = Array.Empty<ServiceRequest>();

    public async Task OnGetAsync(CancellationToken cancellationToken)
    {
        Requests = await _service.GetAllAsync(cancellationToken);
    }

    public string GetCategoryDisplay(ServiceCategory category)
    {
        var member = typeof(ServiceCategory).GetMember(category.ToString()).FirstOrDefault();
        var attr = member?.GetCustomAttribute<DisplayAttribute>();
        return attr?.Name ?? category.ToString();
    }
}
