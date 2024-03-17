import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import axios from 'axios';
import { GraphQLError } from 'graphql';
import { v4 as uuid } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql

  type Category {
    id: ID!
    title: String!
    alias: String
    position: Int!
    published: Boolean
  }

  type Query {
    getListCategories: [Category]
    getCategory(id: String!): Category
  }


  type Mutation {
    addCategory (
      title: String!
      position: String
      published: Boolean
    ): Category
  }

`;

// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
const resolvers = {

  Query: {
    //Para contar el numero de libros
    getListCategories: async (root, args) => {
      try {
        const { data: ListCategories } = await axios.get(process.env.API_URL + '/categories');
        return ListCategories;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') throw new Error('Error al conectar con el API');
        return null;
      }
    },

    getCategory: async (root, {id}) => {
      try {
        const { data: category } = await axios.get(process.env.API_URL + '/categories/' + id);
        return category;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') throw new Error('Error al conectar con el API');
        return null;
      }
    },
  },

  // Para insertar Datos, verificando que el titulo sea unico
  Mutation: {

    addCategory: async(root, args) => {

      let existsCategory = false;
      try {
        // Verificamos si existe una Categoria con el mismo título
        const { data: categorys } = await axios.get(process.env.API_URL + '/categories?title=' + args.title);
        if (categorys.some(category => category.title === args.title)) {
          existsCategory = true;
        }
        console.log("existsCategory: ", existsCategory);
      } catch (error) {
        if (error.code === 'ECONNREFUSED') { 
          throw new Error('Error al conectar con el API');
        }
        throw new Error(error.message);
      }
      if (existsCategory) {
        throw new GraphQLError('El titulo ya existe', {
          extensions: {
            code: 'BAD_USER_INPUT'
          }
        });
      }

      const newCategory = {
        title: args.title,
        position: args.position,
        published: args.published // Esta línea está bien
      };
      console.log("resultado2: ");
      console.log(newCategory);
      try {
        // Creamos el recurso en el API RESTful
        const { data: category }  = await axios.post(process.env.API_URL + '/categories', newCategory);
        return category;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') throw new Error('Error al conectar con el API');
        throw new Error(error.message);
      }
    },
  },
};


// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);