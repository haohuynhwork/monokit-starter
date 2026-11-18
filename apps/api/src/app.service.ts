import { Injectable } from "@nestjs/common";
import { API_PREFIX } from "./common/http/setup/api-prefix.js";

export interface ApiIndex {
  // Base URL of every route, with API_PREFIX
  api: string;
  docs: string;
  graphql: string;
}

@Injectable()
export class AppService {
  // `origin` as the client reached us, e.g. http://localhost:3000
  index(origin: string): ApiIndex {
    const api = `${origin}${API_PREFIX}`;
    return {
      api,
      docs: `${api}/docs`,
      graphql: `${api}/graphql`,
    };
  }
}
