using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Project.DTO;
using Project.Service;
using System.Security.Claims;

namespace Project.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    private string CurrentUserId  => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool   CurrentIsAdmin => User.IsInRole("Admin");

    // GET /api/categories
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cats = await _categoryService.GetCategoriesForUserAsync(CurrentUserId, CurrentIsAdmin);
        return Ok(cats);
    }

    // GET /api/categories/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        return Ok(await _categoryService.GetCategoryByIdAsync(id)); 
    }

    // POST /api/categories
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDTO dto)
    {
        
            var created = await _categoryService.CreateCategoryAsync(dto, CurrentUserId, CurrentIsAdmin);
            return StatusCode(201, created);
    }

    // PUT /api/categories/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCategoryDTO dto)
    {
        
            await _categoryService.UpdateCategoryAsync(id, dto, CurrentUserId, CurrentIsAdmin);
            return NoContent();
        
    }

    // DELETE /api/categories/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        
            await _categoryService.DeleteCategoryAsync(id, CurrentUserId, CurrentIsAdmin);
            return NoContent();
        
    }
}
