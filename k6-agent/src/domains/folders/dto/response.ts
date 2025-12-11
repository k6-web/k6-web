import {Folder, Script} from '@domains/test/models/types';

export type FolderResponse = Folder;

export interface FolderListResponse {
  folders: Folder[];
}

export interface FolderWithScriptsResponse {
  folder: Folder;
  scripts: Script[];
  scriptCount: number;
}
