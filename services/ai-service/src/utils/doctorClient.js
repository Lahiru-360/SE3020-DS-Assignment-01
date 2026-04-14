import axios from 'axios';
import { config } from '../config/index.js';

const doctorApi = axios.create({
  baseURL: config.DOCTOR_SERVICE_URL,
  headers: {
    'x-internal-secret': config.INTERNAL_SECRET,
  },
});

export const searchDoctorsBySpecialty = async (specialization) => {
  try {
    const response = await doctorApi.get('/api/doctors/internal/search', {
      params: { specialization },
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching doctors:', error.message);
    return [];
  }
};
