import { axiosAuth } from './AxiosInstance';
 
export const authApi = {
  register: async ({ email, password, firstName, lastName }) => {
    const { data } = await axiosAuth.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    data.user.role = getRoleFromToken(data.accessToken);
    return data; // { accessToken, accessTokenExpiry, user }
  },
 
  login: async ({ email, password }) => {
    const { data } = await axiosAuth.post('/auth/login', { email, password });
    // Response body has accessToken
    // Response cookie (HttpOnly) has refreshToken — browser handles automatically
    data.user.role = getRoleFromToken(data.accessToken);
    return data;
  },
 
  refresh: async () => {
    // No body needed — HttpOnly cookie is sent automatically by the browser
    const { data } = await axiosAuth.post('/auth/refresh');
    data.user.role = getRoleFromToken(data.accessToken);
    return data;
  },
 
  logout: async () => {
    await axiosAuth.post('/auth/logout');
    // Server clears the HttpOnly cookie
  },
 
  logoutAllDevices: async () => {
    await axiosAuth.post('/auth/logout-all');
  },
};

function getRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // The role claim key ASP.NET Identity uses:
    return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? null;
  } catch { return null; }
}
 