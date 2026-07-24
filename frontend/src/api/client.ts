import axios from "axios";


const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";


const ACCESS_KEY =
  "retailpulse.access_token";

const REFRESH_KEY =
  "retailpulse.refresh_token";



export const tokenStore = {

  getAccess: () =>
    sessionStorage.getItem(
      ACCESS_KEY
    ),


  getRefresh: () =>
    sessionStorage.getItem(
      REFRESH_KEY
    ),


  set(
    access: string,
    refresh: string
  ) {
    sessionStorage.setItem(
      ACCESS_KEY,
      access
    );

    sessionStorage.setItem(
      REFRESH_KEY,
      refresh
    );
  },


  clear() {
    sessionStorage.removeItem(
      ACCESS_KEY
    );

    sessionStorage.removeItem(
      REFRESH_KEY
    );
  },

};



export const api = axios.create({

  baseURL: API_URL,

});



// Attach access token to every request
api.interceptors.request.use(
  (config) => {

    const access =
      tokenStore.getAccess();


    if (access) {
      config.headers.Authorization =
        `Bearer ${access}`;
    }


    return config;

  }
);



let refreshing:
  Promise<string | null> | null = null;



// Refresh token automatically when access token expires
api.interceptors.response.use(

  undefined,

  async (error) => {

    const request =
      error.config;


    if (
      error.response?.status !== 401 ||
      request?._retry ||
      !tokenStore.getRefresh()
    ) {
      return Promise.reject(error);
    }


    request._retry = true;


    refreshing ??=
      axios
        .post(
          `${API_URL}/auth/refresh`,
          {
            refresh_token:
              tokenStore.getRefresh(),
          }
        )

        .then(
          ({ data }) => {

            const refresh =
              tokenStore.getRefresh();


            if (!refresh) {
              return null;
            }


            tokenStore.set(
              data.access_token,
              refresh
            );


            return data.access_token as string;

          }
        )

        .catch(() => {

          tokenStore.clear();

          return null;

        })

        .finally(() => {

          refreshing = null;

        });



    const access =
      await refreshing;


    if (!access) {
      return Promise.reject(error);
    }


    request.headers.Authorization =
      `Bearer ${access}`;


    return api(request);

  }

);