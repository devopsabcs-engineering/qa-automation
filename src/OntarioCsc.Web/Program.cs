using Microsoft.EntityFrameworkCore;
using OntarioCsc.Web.Data;
using OntarioCsc.Web.Services;

var builder = WebApplication.CreateBuilder(args);

// Razor Pages with anti-forgery enabled by default.
builder.Services.AddRazorPages();

// In-memory EF Core database — workshop-only, replace with a real provider before production.
builder.Services.AddDbContext<ServiceRequestContext>(options =>
    options.UseInMemoryDatabase("OntarioCscRequests"));

builder.Services.AddScoped<IServiceRequestService, ServiceRequestService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapRazorPages();

// Seed sample data so the demo always has something to display.
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ServiceRequestContext>();
    ServiceRequestSeeder.EnsureSeeded(context);
}

app.Run();

// Exposed so WebApplicationFactory<Program> can boot the app for integration tests.
public partial class Program;
