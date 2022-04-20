export const getSuccessResponse = (message: string, data: any) => {
  return { success: true, message, data };
};
export const getErrorResponse = (message: string, err: any) => {
  return { success: false, message, err };
};
