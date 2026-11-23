using RestoFlow.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "RestoFlow REST API (Лабораторна робота №3 - СРБД)",
        Version = "v1",
        Description = "ASP.NET Core 8 Web API + Dapper + MS SQL Server (RestaurantDB). Виконав: ст. гр. ПЗПІ-24-2 Єрьоменко М.М."
    });
});

builder.Services.AddSingleton<DbConnectionFactory>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "RestoFlow API v1");
});

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

app.Run();
