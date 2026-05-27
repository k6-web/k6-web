import {Folder, Script} from '@domains/test/test-types';

export type FolderResponse = Folder;

export interface FolderListResponse {
  folders: Folder[];
}

export interface FolderWithScriptsResponse {
  folder: Folder;
  scripts: Script[];
  scriptCount: number;
}

export interface ImportPostmanScriptsResponse {
  scripts: Script[];
  count: number;
}
