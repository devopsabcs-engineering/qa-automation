using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace OntarioCsc.Web.Tests;

/// <summary>
/// Smoke tests that boot the full ASP.NET Core pipeline using
/// <see cref="WebApplicationFactory{Program}"/>. These act as a foundation
/// the Playwright suite can build on later — confirming that the Razor Pages
/// respond with HTTP 200 and Ontario Design System markup.
/// </summary>
public class WebHostSmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public WebHostSmokeTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/Requests")]
    [InlineData("/Requests/New")]
    [InlineData("/Privacy")]
    public async Task Page_Returns200_AndOntarioMarkup(string url)
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("ontario-header", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Common Service Centre", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task NewRequestPage_RendersForm()
    {
        var client = _factory.CreateClient();

        var html = await client.GetStringAsync("/Requests/New");

        Assert.Contains("id=\"new-request-form\"", html);
        Assert.Contains("name=\"Input.FullName\"", html);
        Assert.Contains("name=\"Input.Email\"", html);
    }
}
