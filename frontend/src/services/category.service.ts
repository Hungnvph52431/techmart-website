import api from './api';

export interface CategoryResponse {
    categoryId: number;
    name: string;
    slug: string;
    description?: string;
    parentId?: number;
    imageUrl?: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCategoryData {
    name: string;
    slug: string;
    description?: string;
    parentId?: number | null;
    imageUrl?: string;
    displayOrder?: number;
    isActive?: boolean;
}

export const categoryService = {
    getAll: async (): Promise<CategoryResponse[]> => {
        const response = await api.get('/categories');
        return response.data;
    },

    getById: async (id: number): Promise<CategoryResponse> => {
        const response = await api.get(`/categories/${id}`);
        return response.data;
    },

    create: async (data: CreateCategoryData): Promise<CategoryResponse> => {
        const response = await api.post('/categories', data);
        return response.data;
    },

    update: async (id: number, data: Partial<CreateCategoryData>): Promise<CategoryResponse> => {
        const response = await api.put(`/categories/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/categories/${id}`);
    },
};
