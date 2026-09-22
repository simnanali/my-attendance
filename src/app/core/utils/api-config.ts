/**
 * Base URL of the Node/Express JSON file-server (see /server at the
 * project root). Centralized here so it is a single line to change if
 * the host/port ever differs, and a single seam to remove entirely once
 * the storage layer is swapped for a real .NET Web API — see
 * StorageService for why nothing else needs to know this URL exists.
 */

//This is for dev
//export const API_BASE_URL = 'http://localhost:3000/api';

//This is for UAT
export const API_BASE_URL = 'https://attendance-backend-meei.onrender.com/api';