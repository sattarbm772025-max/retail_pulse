import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import { useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext";

import { DashboardLayout } from "../layouts/DashboardLayout";

import { catalogApi } from "../api/catalogApi";

import { salesApi } from "../api/salesApi";



export function DashboardPage() {

  const { profile } = useAuth();


  const navigate = useNavigate();



  if (!profile) {

    return null;

  }




  const summary = useQuery({

    queryKey: [
      "catalog-summary",
    ],


    queryFn: () =>

      catalogApi
        .summary()
        .then(
          (response) =>
            response.data
        ),

  });





  const salesSummary = useQuery({

    queryKey: [
      "sales-summary",
    ],


    queryFn: () =>

      salesApi
        .summary()
        .then(
          (response) =>
            response.data
        ),

  });





  const items = [

    [
      "Total products",
      summary.data?.total_products ?? 0,
    ],

    [
      "Active products",
      summary.data?.active_products ?? 0,
    ],

    [
      "Inactive products",
      summary.data?.inactive_products ?? 0,
    ],

    [
      "Total categories",
      summary.data?.total_categories ?? 0,
    ],

  ];





  const salesCards = [

    [
      "Total sales",
      `₹${(
        salesSummary.data?.total_sales ?? 0
      ).toFixed(2)}`,
    ],


    [
      "Total revenue",
      `₹${(
        salesSummary.data?.total_revenue ?? 0
      ).toFixed(2)}`,
    ],


    [
      "Total orders",
      salesSummary.data?.total_orders ?? 0,
    ],


    [
      "Average order value",
      `₹${(
        salesSummary.data?.average_order_value ?? 0
      ).toFixed(2)}`,
    ],

  ];






  return (

    <DashboardLayout>


      <Stack

        direction={{
          xs: "column",
          sm: "row",
        }}

        justifyContent="space-between"

        spacing={2}

        mb={4}

      >


        <Box>


          <Typography

            variant="h4"

            fontWeight={800}

          >

            Good to see you,{" "}

            {
              profile.name.split(" ")[0]
            }


          </Typography>



          <Typography

            color="text.secondary"

            mt={1}

          >

            Your organization analytics workspace is ready.

          </Typography>



        </Box>





        <Chip

          label={
            profile.company.name
          }

          variant="outlined"


          sx={{

            alignSelf: "start",

            bgcolor:
              "background.paper",

          }}

        />



      </Stack>







      <Typography

        variant="h6"

        fontWeight={700}

        mb={1}

      >

        Sales overview


      </Typography>







      <Grid

        container

        spacing={2}

      >


        {
          salesCards.map(
            ([label, value]) => (

              <Grid

                key={label}

                size={{

                  xs: 6,

                  sm: 6,

                  md: 3,

                }}

              >


                <Card variant="outlined">


                  <CardContent>


                    <Typography

                      color="text.secondary"

                      variant="body2"

                    >

                      {label}


                    </Typography>



                    <Typography

                      fontWeight={800}

                      mt={1}

                    >

                      {value}


                    </Typography>



                  </CardContent>


                </Card>



              </Grid>


            )
          )
        }


      </Grid>








      <Typography

        variant="h6"

        fontWeight={700}

        mt={4}

        mb={1}

      >

        Catalog overview


      </Typography>







      <Grid

        container

        spacing={2}

      >


        {
          items.map(
            ([label, value]) => (

              <Grid

                key={label}

                size={{

                  xs: 6,

                  sm: 6,

                  md: 3,

                }}

              >


                <Card variant="outlined">


                  <CardContent>



                    <Typography

                      color="text.secondary"

                      variant="body2"

                    >

                      {label}


                    </Typography>




                    <Typography

                      fontWeight={700}

                      mt={1}

                    >

                      {value}


                    </Typography>



                  </CardContent>


                </Card>



              </Grid>


            )
          )
        }



      </Grid>








      <Card

        variant="outlined"

        sx={{

          mt: 3,

        }}

      >


        <CardContent>



          <Typography

            variant="h6"

            fontWeight={700}

          >

            Tenant-secure workspace


          </Typography>





          <Typography

            color="text.secondary"

            mt={1}

          >

            All products, sales, inventory, and future analytics
            requests are scoped to{" "}

            {
              profile.company.name
            }.


          </Typography>






          <Stack

            direction="row"

            spacing={1}

            mt={2}

          >



            <Button

              variant="contained"

              onClick={() =>
                navigate("/sales")
              }

            >

              Record sale


            </Button>





            <Button

              variant="outlined"

              onClick={() =>
                navigate("/catalog")
              }

            >

              Manage catalog


            </Button>




          </Stack>





        </CardContent>



      </Card>





    </DashboardLayout>


  );

}