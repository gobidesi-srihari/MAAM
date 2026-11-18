
/* =========================================
   API CONFIGURATION
========================================= */

// const API_BASE_URL = "http://localhost:8000";
const API_BASE_URL = "/api";


/* =========================================
   COMMON API REQUEST FUNCTION
   Supports GET, POST, PUT, PATCH, DELETE
   Supports JSON and FormData
   Includes JWT Authentication
========================================= */

export async function apiRequest(endpoint, options = {}) {
  // Get JWT token after login
  const token = localStorage.getItem("access_token");

  // Check whether the request contains a file
  const isFormData = options.body instanceof FormData;

  // Prepare request headers
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // JSON requests require application/json.
  // FormData must use the browser-generated multipart boundary.
  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  } else if (
    !Object.keys(headers).some(
      (key) => key.toLowerCase() === "content-type"
    )
  ) {
    headers["Content-Type"] = "application/json";
  }

  // Send request to FastAPI
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  // Handle HTTP 204 - No Content
  if (response.status === 204) {
    if (!response.ok) {
      throw new Error("API request failed");
    }
    return null;
  }

  // Read JSON response
  const data = await response.json().catch(() => ({}));

  // Handle API errors
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : data.message || `API request failed (${response.status})`
    );
  }

  return data;
}


/* =========================================
   SUBSTATION APIs
========================================= */

// GET - Fetch all substations
export async function getSubstations() {
  return apiRequest("/substations");
}

// POST - Create a new substation
export async function createSubstation(data) {
  return apiRequest("/substations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}


/* =========================================
   EQUIPMENT TYPES APIs
========================================= */

// GET - Equipment types for a specific substation
export async function getEquipmentTypes(substationId) {
  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}/equipment-types`
  );
}

// POST - Create a new equipment type
export async function createEquipmentType(substationId, data) {
  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}/equipment-types`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}


/* =========================================
   INDIVIDUAL EQUIPMENT APIs
========================================= */

// GET - Equipment for a specific substation and type
export async function getEquipment(
  substationId,
  equipmentTypeId
) {
  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}` +
    `/equipment-types/${encodeURIComponent(equipmentTypeId)}/equipment`
  );
}

// POST - Create individual equipment
export async function createEquipment(
  substationId,
  equipmentTypeId,
  data
) {
  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}` +
    `/equipment-types/${encodeURIComponent(equipmentTypeId)}/equipment`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}


/* =========================================
   INDIVIDUAL EQUIPMENT DETAILS API
========================================= */

// GET - Details of a specific equipment record
export async function getEquipmentDetails(
  substationId,
  equipmentTypeId,
  equipmentId
) {
  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}` +
    `/equipment-types/${encodeURIComponent(equipmentTypeId)}` +
    `/equipment/${encodeURIComponent(equipmentId)}`
  );
}


/* =========================================
   TRANSFORMER NAMEPLATE APIs
========================================= */

// GET - Transformer nameplate metadata
export async function getTransformerNameplate(
  substationId,
  equipmentId
) {
  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}` +
    `/transformers/${encodeURIComponent(equipmentId)}/nameplate`
  );
}


// POST - Upload or replace transformer nameplate image
export async function uploadTransformerNameplate(
  substationId,
  equipmentId,
  file
) {
  const formData = new FormData();

  formData.append("file", file);

  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}` +
    `/transformers/${encodeURIComponent(equipmentId)}/nameplate`,
    {
      method: "POST",
      body: formData,
    }
  );
}


// GET - Retrieve protected transformer nameplate image
export async function getTransformerNameplateImage(
  substationId,
  equipmentId
) {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${API_BASE_URL}/substations/` +
    `${encodeURIComponent(substationId)}/transformers/` +
    `${encodeURIComponent(equipmentId)}/nameplate/image`,
    {
      method: "GET",
      headers: {
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load nameplate image (${response.status})`
    );
  }

  // Convert protected image response into a browser URL.
  // The calling component must revoke this URL when done.
  const imageBlob = await response.blob();

  return URL.createObjectURL(imageBlob);
}


/* =========================================
   TRANSFORMER BREAKDOWN VOLTAGE APIs
========================================= */

// GET - Retrieve historical BDV readings
export async function getTransformerBDV(
  substationId,
  equipmentId
) {
  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}` +
    `/transformers/${encodeURIComponent(equipmentId)}/bdv`
  );
}

// POST - Add a new BDV reading
export async function createTransformerBDV(
  substationId,
  equipmentId,
  data
) {
  return apiRequest(
    `/substations/${encodeURIComponent(substationId)}` +
    `/transformers/${encodeURIComponent(equipmentId)}/bdv`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}
