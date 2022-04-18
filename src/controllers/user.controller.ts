import * as express from 'express';

import { UserModel } from '../models';

export default class UserController {
  public static login = async (
    request: express.Request,
    response: express.Response
  ) => {
    try {
      const credentials = request.body;
      const result = await UserModel.login(credentials);
      response.status(200).send(result);
    } catch (err) {
      response.send(err);
    }
  };

  public static signup = async (
    request: express.Request,
    response: express.Response
  ) => {
    try {
      const user = request.body;
      if (request['file']) {
        user['image'] = 'images/' + request['file'].filename;
      }
      
      const result = await UserModel.signup(user);
      response.status(200).send(result);
    } catch (err) {
      response.send(err);
    }
  };

  public static updateUser = async (
    request: express.Request,
    response: express.Response
  ) => {
    try {
      const user = request.body;
      if (request['file']) {
        user['image'] = 'images/' + request['file'].filename;
      }
      const result = await UserModel.updateUser(user);
      response.status(200).send(result);
    } catch (err) {
      response.send(err);
    }
  };
}
