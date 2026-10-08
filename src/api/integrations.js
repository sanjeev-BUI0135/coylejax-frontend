//import { base44 } from './base44Client';




//export const Core = base44.integrations.Core;

//export const InvokeLLM = base44.integrations.Core.InvokeLLM;

//export const SendEmail = base44.integrations.Core.SendEmail;

//export const UploadFile = base44.integrations.Core.UploadFile;

//export const GenerateImage = base44.integrations.Core.GenerateImage;

//export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile;


import localApi from '../services/localApi';

// Re-exporting core integrations from our localApi service.

export const UploadFile = localApi.integrations.UploadFile;
export const SendEmail = localApi.integrations.SendEmail;
export const InvokeLLM = localApi.integrations.InvokeLLM;
export const GenerateImage = localApi.integrations.GenerateImage;
export const ExtractDataFromUploadedFile = localApi.integrations.ExtractDataFromUploadedFile;



