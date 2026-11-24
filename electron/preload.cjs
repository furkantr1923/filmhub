/**
 * Ön yükleme betiği: web arayüzüne yalnızca zararsız platform bilgisini açar.
 * Node.js API'lerine erişim verilmez.
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('filmhubDesktop', {
  platform: process.platform,
  version: process.versions.electron,
});
