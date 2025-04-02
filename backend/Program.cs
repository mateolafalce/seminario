using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);

// Configurar la base de datos SQLite y Identity
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=users.db"));
builder.Services.AddIdentity<User, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();
builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseAuthentication();
app.UseAuthorization();

// Registro de usuario
app.MapPost("/register", async (UserRegisterDto dto, UserManager<User> userManager) =>
{
    var user = new User { UserName = dto.Username };
    var result = await userManager.CreateAsync(user, dto.Password);
    return result.Succeeded ? Results.Ok("Usuario registrado") : Results.BadRequest(result.Errors);
});

// Login de usuario
app.MapPost("/login", async (UserLoginDto dto, UserManager<User> userManager, SignInManager<User> signInManager) =>
{
    var user = await userManager.FindByNameAsync(dto.Username);
    if (user == null) return Results.BadRequest("Usuario o contraseña incorrectos");
    var result = await signInManager.CheckPasswordSignInAsync(user, dto.Password, false);
    return result.Succeeded ? Results.Ok("Inicio de sesión exitoso") : Results.BadRequest("Usuario o contraseña incorrectos");
});

// Ruta para devolver el index.html al hacer un GET
app.MapGet("/", async (HttpContext context) =>
{
    await context.Response.SendFileAsync("wwwroot/index.html");
});

// Ruta para devolver el index.html al hacer un GET
app.MapGet("/login", async (HttpContext context) =>
{
    await context.Response.SendFileAsync("wwwroot/login.html");
});

// Ruta para devolver el index.html al hacer un GET
app.MapGet("/register", async (HttpContext context) =>
{
    await context.Response.SendFileAsync("wwwroot/register.html");
});

app.Run();

// Clases de modelo y base de datos
public class AppDbContext : IdentityDbContext<User>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
}

public class User : IdentityUser { }

public class UserRegisterDto
{
    [Required] public string Username { get; set; }
    [Required] public string Password { get; set; }
}

public class UserLoginDto
{
    [Required] public string Username { get; set; }
    [Required] public string Password { get; set; }
}
