// src/types.ts

export type RootStackParamList = {
  Login: undefined;
  Feed: undefined;
  ReactionList: { postId: string };
  Comments: { postId: string }; // Adicionada
};

export interface DocumentPickerSuccessResult {
  type: "success";
  uri: string;
  name: string;
  mimeType: string;
}

export interface DocumentPickerCancelResult {
  type: "cancel";
}

export type DocumentPickerResult =
  | DocumentPickerSuccessResult
  | DocumentPickerCancelResult;
