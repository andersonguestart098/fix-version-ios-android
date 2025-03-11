// src/types.ts

export type RootStackParamList = {
  Login: undefined;
  Feed: undefined;
  CalendarEvents: undefined;
  CalendarHolidays: undefined;
  CalendarBirthdays: undefined;
  FileManager: undefined;
  Chat: { conversationId: string; userId: string; receiverId: string };
  Comments: { postId: string };
  ReactionList: { postId: string };
  DirectMessages: undefined; // Adicionado para a tela de mensagens diretas
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
