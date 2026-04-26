import axiosInstance from './axiosInstance';

// GET /api/users — returns all users for dropdowns (assign-to field, etc.)
// Your backend needs this endpoint. If it doesn't exist yet, add it:
//
//   [HttpGet] [Authorize] [Route("api/users")]
//   public async Task<IActionResult> GetAll() {
//     var users = await _userManager.Users
//       .Select(u => new { u.Id, u.Email, u.FirstName, u.LastName, u.ProfilePictureUrl })
//       .ToListAsync();
//     return Ok(users);
//   }
export const getUsers = () =>
  axiosInstance.get('/api/users');

export const getAuditLogs = (params) =>
  axiosInstance.get('/api/audit-logs', { params });

export const getProfile = () =>
  axiosInstance.get('/api/profile');

export const updateProfile = (data) =>
  axiosInstance.put('/api/profile', data);

export const uploadProfilePicture = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance.post('/api/profile/picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const changePassword = (data) =>
  axiosInstance.post('/api/profile/change-password', data);

export const deleteAccount = (currentPassword) =>
  axiosInstance.delete('/api/profile', { data: { currentPassword } });