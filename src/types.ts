// src/types.ts

export type RootStackParamList = {
  Login: undefined;
  Feed: undefined;
  CalendarEvents: undefined;
  CalendarHolidays: undefined;
  CalendarBirthdays: undefined;
  FileManager: undefined;
  Comments: { postId: string };
  ReactionList: { postId: string }; // Adicionando ReactionList com parâmetros
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
