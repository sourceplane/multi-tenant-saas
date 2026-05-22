// Worker code for Task 0011 - Core implementation
export default {
  async fetch(request, env) {
    // Main entry point for worker requests
    try {
      // Parse request
      const url = new URL(request.url);
      const method = request.method;
      
      // Authenticate
      const token = request.headers.get('Authorization');
      if (!token) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      // Connect to Hyperdrive
      const db = await env.DB.connect();
      
      // Route request based on path
      if (url.pathname.startsWith('/api/')) {
        // Handle API requests
        return handleApiRequest(request, db);
      } else {
        // Handle other requests
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

// Handle API requests
async function handleApiRequest(request, db) {
  const url = new URL(request.url);
  const method = request.method;
  
  try {
    switch (method) {
      case 'GET':
        return handleGet(url, db);
      case 'POST':
        return handlePost(request, db);
      case 'PUT':
        return handlePut(request, db);
      case 'DELETE':
        return handleDelete(url, db);
      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  } catch (error) {
    console.error('API handler error:', error);
    return new Response('Bad Request', { status: 400 });
  }
}

// GET handler
async function handleGet(url, db) {
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response('ID parameter required', { status: 400 });
  }
  
  // Query database using Hyperdrive
  const result = await db.query('SELECT * FROM items WHERE id = $1', [id]);
  return new Response(JSON.stringify(result.rows), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// POST handler
async function handlePost(request, db) {
  const body = await request.json();
  const { name, value } = body;
  
  if (!name || !value) {
    return new Response('Name and value are required', { status: 400 });
  }
  
  // Insert into database
  const result = await db.query(
    'INSERT INTO items (name, value) VALUES ($1, $2) RETURNING *',
    [name, value]
  );
  
  return new Response(JSON.stringify(result.rows[0]), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

// PUT handler
async function handlePut(request, db) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const body = await request.json();
  const { name, value } = body;
  
  if (!id || !name || !value) {
    return new Response('ID, name, and value are required', { status: 400 });
  }
  
  // Update database
  const result = await db.query(
    'UPDATE items SET name = $1, value = $2 WHERE id = $3 RETURNING *',
    [name, value, id]
  );
  
  if (result.rows.length === 0) {
    return new Response('Item not found', { status: 404 });
  }
  
  return new Response(JSON.stringify(result.rows[0]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// DELETE handler
async function handleDelete(url, db) {
  const id = url.searchParams.get('id');
  
  if (!id) {
    return new Response('ID parameter required', { status: 400 });
  }
  
  // Delete from database
  const result = await db.query(
    'DELETE FROM items WHERE id = $1 RETURNING *',
    [id]
  );
  
  if (result.rows.length === 0) {
    return new Response('Item not found', { status: 404 });
  }
  
  return new Response('Item deleted', { status: 200 });
}

// JWT authentication (placeholder)
function authenticate(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  // In production, validate the token here
  return token;
}
