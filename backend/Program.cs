var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Habilitar la carpeta wwwroot para servir archivos estáticos
app.UseStaticFiles();

// Ruta para devolver el index.html al hacer un GET
app.MapGet("/", async (HttpContext context) =>
{
    await context.Response.SendFileAsync("wwwroot/index.html");
});

app.Run();
