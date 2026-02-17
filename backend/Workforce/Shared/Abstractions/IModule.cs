namespace Workforce.Shared.Abstractions;
public interface IModule { void RegisterServices(IServiceCollection services); void MapEndpoints(IEndpointRouteBuilder app); }