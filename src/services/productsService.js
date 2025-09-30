const { query } = require("../../db");
const bcrypt = require("bcrypt");

const productsService = {
  // Categorías
  getCategories: async () => {
    const result = await query(
      `SELECT idcategoria, nombre, estado 
       FROM categorias 
       WHERE estado IN (0, 1)
       ORDER BY nombre`
    );
    return result.rows;
  },

  createCategory: async (nombre) => {
    // Verificar si ya existe una categoría con el mismo nombre (activa o inactiva)
    const existingCategory = await query(
      `SELECT idcategoria FROM categorias WHERE nombre = $1 AND estado IN (0, 1)`,
      [nombre]
    );

    if (existingCategory.rows.length > 0) {
      throw new Error("Ya existe una categoría con ese nombre");
    }

    // Si existe una categoría eliminada con el mismo nombre, reactivarla
    const deletedCategory = await query(
      `SELECT idcategoria FROM categorias WHERE nombre = $1 AND estado = 2`,
      [nombre]
    );

    if (deletedCategory.rows.length > 0) {
      const result = await query(
        `UPDATE categorias SET estado = 0 WHERE idcategoria = $1 RETURNING *`,
        [deletedCategory.rows[0].idcategoria]
      );
      return result.rows[0];
    }

    // Crear nueva categoría
    const result = await query(
      `INSERT INTO categorias (nombre, estado) 
       VALUES ($1, 0) 
       RETURNING *`,
      [nombre]
    );
    return result.rows[0];
  },

  updateCategory: async (id, nombre) => {
    // Verificar si ya existe otra categoría con el mismo nombre
    const existingCategory = await query(
      `SELECT idcategoria FROM categorias 
       WHERE nombre = $1 AND idcategoria != $2 AND estado IN (0, 1)`,
      [nombre, id]
    );

    if (existingCategory.rows.length > 0) {
      throw new Error("Ya existe otra categoría con ese nombre");
    }

    const result = await query(
      `UPDATE categorias SET nombre = $1 WHERE idcategoria = $2 RETURNING *`,
      [nombre, id]
    );

    if (result.rows.length === 0) {
      throw new Error("Categoría no encontrada");
    }

    return result.rows[0];
  },

  toggleCategoryStatus: async (id) => {
    const result = await query(
      `UPDATE categorias 
       SET estado = CASE WHEN estado = 0 THEN 1 ELSE 0 END 
       WHERE idcategoria = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error("Categoría no encontrada");
    }

    return result.rows[0];
  },

  // Productos
  getProducts: async () => {
    const result = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.estado IN (0, 1)
       ORDER BY c.nombre, p.nombre`
    );
    
    // Convertir imágenes bytea a base64
    const productsWithBase64 = result.rows.map(product => {
      if (product.imagen) {
        // Convertir Buffer a base64
        const base64Image = product.imagen.toString('base64');
        return {
          ...product,
          imagen: base64Image // Enviar solo el base64, el frontend construirá la data URL
        };
      }
      return product;
    });

    return productsWithBase64;
  },

  getActiveProducts: async () => {
    const result = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.estado = 0 AND c.estado = 0
       ORDER BY c.nombre, p.nombre`
    );
    
    // Convertir imágenes bytea a base64
    const productsWithBase64 = result.rows.map(product => {
      if (product.imagen) {
        // Convertir Buffer a base64
        const base64Image = product.imagen.toString('base64');
        return {
          ...product,
          imagen: base64Image
        };
      }
      return product;
    });

    return productsWithBase64;
  },

  createProduct: async (productData) => {
    const { nombre, descripcion, categoria_id, precio, imagen } = productData;

    // Verificar si la categoría existe y está activa
    const category = await query(
      `SELECT idcategoria FROM categorias WHERE idcategoria = $1 AND estado = 0`,
      [categoria_id]
    );

    if (category.rows.length === 0) {
      throw new Error("La categoría seleccionada no existe o no está activa");
    }

    // Si la imagen viene como base64, convertirla a Buffer
    let imagenBuffer = null;
    if (imagen) {
      try {
        // Extraer solo el base64 si viene como data URL
        const base64Data = imagen.startsWith('data:') 
          ? imagen.split(',')[1] 
          : imagen;
        
        imagenBuffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error('Error convirtiendo imagen a Buffer:', error);
        throw new Error('Formato de imagen inválido');
      }
    }

    const result = await query(
      `INSERT INTO productos (nombre, descripcion, categoria_id, precio, imagen, estado) 
       VALUES ($1, $2, $3, $4, $5, 0) 
       RETURNING *`,
      [nombre, descripcion, categoria_id, precio, imagenBuffer]
    );

    // Obtener el producto con el nombre de la categoría y convertir imagen
    const productWithCategory = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.idproducto = $1`,
      [result.rows[0].idproducto]
    );

    // Convertir imagen a base64 para la respuesta
    const product = productWithCategory.rows[0];
    if (product.imagen) {
      product.imagen = product.imagen.toString('base64');
    }

    return product;
  },

  updateProduct: async (id, productData) => {
    const { nombre, descripcion, categoria_id, precio, imagen } = productData;

    // Verificar si la categoría existe y está activa
    const category = await query(
      `SELECT idcategoria FROM categorias WHERE idcategoria = $1 AND estado = 0`,
      [categoria_id]
    );

    if (category.rows.length === 0) {
      throw new Error("La categoría seleccionada no existe o no está activa");
    }

    // Si la imagen viene como base64, convertirla a Buffer
    let imagenBuffer = null;
    if (imagen) {
      try {
        // Extraer solo el base64 si viene como data URL
        const base64Data = imagen.startsWith('data:') 
          ? imagen.split(',')[1] 
          : imagen;
        
        imagenBuffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error('Error convirtiendo imagen a Buffer:', error);
        throw new Error('Formato de imagen inválido');
      }
    }

    const result = await query(
      `UPDATE productos 
       SET nombre = $1, descripcion = $2, categoria_id = $3, precio = $4, imagen = $5 
       WHERE idproducto = $6 
       RETURNING *`,
      [nombre, descripcion, categoria_id, precio, imagenBuffer, id]
    );

    if (result.rows.length === 0) {
      throw new Error("Producto no encontrado");
    }

    // Obtener el producto con el nombre de la categoría y convertir imagen
    const productWithCategory = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.idproducto = $1`,
      [id]
    );

    // Convertir imagen a base64 para la respuesta
    const product = productWithCategory.rows[0];
    if (product.imagen) {
      product.imagen = product.imagen.toString('base64');
    }

    return product;
  },

  toggleProductStatus: async (id) => {
    const result = await query(
      `UPDATE productos 
       SET estado = CASE WHEN estado = 0 THEN 1 ELSE 0 END 
       WHERE idproducto = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error("Producto no encontrado");
    }

    // Obtener el producto con el nombre de la categoría y convertir imagen
    const productWithCategory = await query(
      `SELECT p.idproducto, p.nombre, p.descripcion, p.categoria_id, 
              p.precio::text, p.imagen, p.estado, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.idcategoria
       WHERE p.idproducto = $1`,
      [id]
    );

    // Convertir imagen a base64 para la respuesta
    const product = productWithCategory.rows[0];
    if (product.imagen) {
      product.imagen = product.imagen.toString('base64');
    }

    return product;
  },

  deleteProduct: async (id) => {
    const result = await query(
      `UPDATE productos SET estado = 2 WHERE idproducto = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error("Producto no encontrado");
    }

    return result.rows[0];
  }
};

module.exports = productsService;