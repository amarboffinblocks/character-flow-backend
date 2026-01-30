import { folderRepository } from './folder.repository.js';
import { createError } from '../../utils/index.js';
import type {
  CreateFolderInput,
  UpdateFolderInput,
  FolderQueryParams,
  FolderResponse,
  FolderListResponse,
  MessageResponse,
  CreateFolderData,
  UpdateFolderData,
  FolderWithCount,
} from './folder.types.js';

// ============================================
// Folder Service
// ============================================

export const folderService = {
  // ============================================
  // Get Folders by User
  // ============================================

  async getUserFolders(userId: string, params: FolderQueryParams): Promise<FolderListResponse> {
    const { page = 1, limit = 20 } = params;

    const { folders, total } = await folderRepository.findFoldersByUser(userId, params);

    // Transform folders to include chat count
    const transformedFolders = folders.map((folder) => {
      const { _count, ...folderData } = folder as FolderWithCount;
      return {
        ...folderData,
        chatCount: _count.chats,
      };
    });

    const totalPages = limit === 0 ? 1 : Math.ceil(total / limit);

    return {
      folders: transformedFolders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  // ============================================
  // Get Folder by ID
  // ============================================

  async getFolderById(id: string, userId: string): Promise<FolderResponse> {
    const folder = await folderRepository.findFolderByIdAndUser(id, userId);

    if (!folder) {
      throw createError.notFound('Folder not found');
    }

    const { _count, ...folderData } = folder as FolderWithCount;
    return {
      folder: {
        ...folderData,
        chatCount: _count.chats,
      },
    };
  },

  // ============================================
  // Create Folder
  // ============================================

  async createFolder(userId: string, input: CreateFolderInput): Promise<FolderResponse> {
    const folderData: CreateFolderData = {
      userId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
    };

    const folder = await folderRepository.createFolder(folderData);

    const { _count, ...folderWithoutCount } = folder as any;
    return {
      folder: {
        ...folderWithoutCount,
        chatCount: _count?.chats || 0,
      },
    };
  },

  // ============================================
  // Update Folder
  // ============================================

  async updateFolder(id: string, userId: string, input: UpdateFolderInput): Promise<FolderResponse> {
    // Check if folder exists and belongs to user
    const existingFolder = await folderRepository.findFolderByIdAndUser(id, userId);
    if (!existingFolder) {
      throw createError.notFound('Folder not found');
    }

    const updateData: UpdateFolderData = {
      name: input.name,
      description: input.description,
      color: input.color,
    };

    const folder = await folderRepository.updateFolder(id, updateData);

    const { _count, ...folderWithoutCount } = folder as any;
    return {
      folder: {
        ...folderWithoutCount,
        chatCount: _count?.chats || 0,
      },
    };
  },

  // ============================================
  // Delete Folder
  // ============================================

  async deleteFolder(id: string, userId: string): Promise<MessageResponse> {
    // Check if folder exists and belongs to user
    const existingFolder = await folderRepository.findFolderByIdAndUser(id, userId);
    if (!existingFolder) {
      throw createError.notFound('Folder not found');
    }

    // When deleting a folder, chats will be set to null (uncategorized) due to onDelete: SetNull
    await folderRepository.deleteFolder(id);

    return {
      message: 'Folder deleted successfully. Chats in this folder are now uncategorized.',
    };
  },
};
