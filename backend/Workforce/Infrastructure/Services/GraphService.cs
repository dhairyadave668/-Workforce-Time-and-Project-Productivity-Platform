using Azure.Identity;
using Microsoft.Graph;

namespace Workforce.Infrastructure.Services;

public class GraphService
{
    public GraphServiceClient Client { get; }

    public GraphService(IConfiguration config)
    {
        var tenantId = config["AzureAd:TenantId"];
        var clientId = config["AzureAd:ClientId"];
        var clientSecret = config["AzureAd:ClientSecret"];

        var credential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret);

        Client = new GraphServiceClient(credential);
    }

    public async Task AssignRoleToUser(
        string userObjectId,
        string roleId,
        string appObjectId)
    {
        var assignment = new Microsoft.Graph.Models.AppRoleAssignment
        {
            PrincipalId = Guid.Parse(userObjectId),
            ResourceId = Guid.Parse(appObjectId),
            AppRoleId = Guid.Parse(roleId)
        };

        await Client.Users[userObjectId]
            .AppRoleAssignments
            .PostAsync(assignment);
    }
}