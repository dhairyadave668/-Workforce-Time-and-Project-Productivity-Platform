﻿namespace Workforce.Features.Projects.DTOs;

public class UpdateTaskStatusDto
{
    public string Status { get; set; } = null!;
    public string EntraId { get; set; } = string.Empty;
}