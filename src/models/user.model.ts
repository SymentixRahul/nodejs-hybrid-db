import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Aws from 'aws-sdk';

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

import { UserSchema } from '../schemas/postgresql';
import config from '../../config';
import { getErrorResponse, getSuccessResponse } from '../util/response';
const dbConfig = require('../schemas/dynamoDB/config');

Aws.config.update(dbConfig.aws_local_config);
const docClient = new Aws.DynamoDB.DocumentClient();
export default class UserModel {
  public static login = async (credentials: {
    email: string;
    role: string;
    password: string;
  }) => {
    try {
      const filter = { email: credentials.email, role: credentials.role };
      const user = await UserSchema.findOne({
        where: filter
      });
      if (user && user.password) {
        const comparePass = bcrypt.compareSync(
          credentials.password,
          user.password
        );
        if (comparePass) {
          const token = jwt.sign(
            {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              role: user.role
            },
            config.ENCRYPTION_KEY,
            { expiresIn: '7d' }
          );
          return { token };
        } else {
          const errorDetails = {
            code: 401,
            error: 'UNAUTHORIZED',
            originalInfo: 'Login failed!'
          };
          return errorDetails;
        }
      } else {
        const errorDetails = {
          code: 401,
          error: 'UNAUTHORIZED',
          originalInfo: 'Login failed!'
        };
        return errorDetails;
      }
    } catch (err) {
      const errorDetails = {
        code: 500,
        error: 'SERVER_ERROR',
        originalInfo: err
      };
      return errorDetails;
    }
  };

  public static signup = async (userObject: any) => {
    const userExist = await UserSchema.findOne({
      where: {
        email: userObject.email,
        username: userObject.username
      }
    });
    if (userExist) {
      return 'already exists';
    } else {
      if (
        userObject.password != 'undefined' &&
        userObject.password.length > 0
      ) {
        userObject.password = await UserModel.hashPassword(userObject.password);
      }
      if (!userObject.username) {
        userObject.username = userObject.first_name + ' _ ' + Date.now();
      }
      const user = await UserSchema.create(userObject, { raw: true });
      const token = jwt.sign(
        {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role
        },
        config.ENCRYPTION_KEY,
        { expiresIn: '7d' }
      );
      const todayTime = new Date().toISOString();
      const params = {
        TableName: dbConfig.aws_user_table_name,
        Item: {
          userId: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          username: user.username,
          contact_no: user.contact_no,
          password: user.password,
          role: user.role,
          status: user.status,
          created_at: todayTime,
          updated_at: todayTime
        }
      };
      docClient.put(params, (err, data) => {
        if (err) {
          console.log({ err });
          return err;
        } else {
          return { token };
        }
      });
    }
  };

  public static updateUser = async (userObject: any) => {
    const updatedUser = await UserSchema.update(userObject, {
      where: { id: userObject.id }
    });

    const params: any = {
      TableName: dbConfig.aws_user_table_name,
      Key: {
        userId: userObject.id
      },
      UpdateExpression:
        'Set first_name = :fn, last_name = :ln, username = :un, image = :img, email = :e, contact_no = :cn, role = :r, status = :s',
      ExpressionAttributeValues: {
        ':fn': userObject.first_name,
        ':ln': userObject.last_name,
        ':un': userObject.username,
        ':img': userObject.image ? userObject.image : null,
        ':e': userObject.email,
        ':cn': userObject.contact_no,
        ':r': userObject.role,
        ':s': userObject.status
      },
      ReturnValues: 'UPDATED_NEW'
    };
    docClient.update(params, (err, data) => {
      if (err) {
        console.log({ err });
        return err;
      } else {
        console.log({ data });
      }
    });
  };

  public static getUserById = (userId: any): Promise<any> =>
    new Promise((reject, resolve) => {
      const ddb = new Aws.DynamoDB();
      const params = {
        TableName: dbConfig.aws_user_table_name,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': { N: userId }
        }
      };
      ddb.query(params, (err, data) => {
        if (err) {
          const error = getErrorResponse('Error in fetch user', err);
          reject(error);
        } else {
          const { Items } = data;
          const response = getSuccessResponse('Fetch user successfully', Items);
          resolve(response);
        }
      });
    });

  public static getAllUsers = (): Promise<any> =>
    new Promise((reject, resolve) => {
      const ScanParams = {
        TableName: dbConfig.aws_user_table_name // give it your table name
      };
      return docClient.scan(ScanParams, (err, data) => {
        if (err) {
          const error = getErrorResponse('Error in fetch users', err);
          reject(error);
        } else {
          const { Items } = data;
          const response = getSuccessResponse(
            'Fetch all users successfully',
            Items
          );
          resolve(response);
        }
      });
    });

  public static deleteUser = async userId => {
    const params = {
      TableName: dbConfig.aws_user_table_name,
      Key: {
        id: userId
      }
    };
    docClient.delete(params, function(err, data) {
      if (err) {
        console.log('Error', err);
        return err;
      } else {
        console.log('Success', data);
        UserSchema.update(
          { status: 2 },
          {
            where: { id: userId }
          }
        );
        return { success: true, message: 'Record deleted successfully' };
      }
    });
  };

  private static hashPassword = async data => {
    const password = data;
    const saltRounds = 10;
    const hashedPassword = await new Promise((resolve, reject) => {
      bcrypt.hash(password, saltRounds, function(err, hash) {
        if (err) reject(err);
        resolve(hash);
      });
    });
    return hashedPassword;
  };

  private static generatePassword() {
    var length = 6,
      charset = 'abcdefghijklmnopqrstuvwxyz123456789',
      retVal = '';
    for (var i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }
}
