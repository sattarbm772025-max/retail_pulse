import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";


import {
  inventoryApi,
  type InventoryItem,
} from "../api/inventoryApi";


import { catalogApi } from "../api/catalogApi";


import { DashboardLayout } from "../layouts/DashboardLayout";


import { useAuth } from "../context/AuthContext";





export function InventoryPage() {


  const { profile } = useAuth();



  const admin =
    [
      "SUPER_ADMIN",
      "COMPANY_ADMIN",
    ].includes(
      profile?.role ?? ""
    );



  const client = useQueryClient();




  const [
    search,
    setSearch,
  ] = useState("");



  const [
    categoryId,
    setCategoryId,
  ] = useState("");



  const [
    brand,
    setBrand,
  ] = useState("");



  const [
    status,
    setStatus,
  ] = useState("");



  const [
    sort,
    setSort,
  ] = useState("updated");




  const [
    selected,
    setSelected,
  ] = useState<InventoryItem | null>(
    null
  );



  const [
    history,
    setHistory,
  ] = useState<InventoryItem | null>(
    null
  );




  const [
    adjustment,
    setAdjustment,
  ] = useState({

    adjustment_type:
      "STOCK_IN",

    quantity:
      1,

    reason:
      "",

    remarks:
      "",

  });




  const [
    error,
    setError,
  ] = useState("");







  const inventory = useQuery({


    queryKey: [

      "inventory",

      search,

      categoryId,

      brand,

      status,

      sort,

    ],



    queryFn: () =>

      inventoryApi

        .list({

          search,


          category_id:
            categoryId || undefined,


          brand,


          stock_status:
            status || undefined,


          sort,

        })


        .then(

          (response) =>
            response.data

        ),


  });







  const summary = useQuery({


    queryKey: [

      "inventory-summary",

    ],



    queryFn: () =>

      inventoryApi

        .summary()

        .then(

          (response) =>
            response.data

        ),


  });







  const charts = useQuery({


    queryKey: [

      "inventory-charts",

    ],



    queryFn: () =>

      inventoryApi

        .charts()

        .then(

          (response) =>
            response.data

        ),


  });







  const categories = useQuery({


    queryKey: [

      "inventory-categories",

    ],



    queryFn: () =>

      catalogApi

        .categories()

        .then(

          (response) =>
            response.data

        ),


  });







  const moves = useQuery({


    queryKey: [

      "movements",

      history?.id,

    ],



    enabled:

      Boolean(history),



    queryFn: () =>

      inventoryApi

        .movements(

          history!.id

        )

        .then(

          (response) =>
            response.data

        ),


  });







  const adjust = useMutation({


    mutationFn: () =>

      inventoryApi.adjust(

        selected!.id,

        adjustment

      ),




    onSuccess: () => {


      client.invalidateQueries({

        queryKey:[
          "inventory",
        ],

      });



      client.invalidateQueries({

        queryKey:[
          "inventory-summary",
        ],

      });



      client.invalidateQueries({

        queryKey:[
          "inventory-charts",
        ],

      });



      setSelected(null);



    },





    onError: (error:any) => {


      setError(

        error.response?.data?.detail ??

        "Unable to adjust stock"

      );


    },


  });







  const cards = [


    [

      "Total products",

      summary.data?.total_products,

    ],



    [

      "Total inventory",

      summary.data?.total_inventory_quantity,

    ],



    [

      "Low stock",

      summary.data?.low_stock_products,

    ],



    [

      "Out of stock",

      summary.data?.out_of_stock_products,

    ],


  ];
  return (

    <DashboardLayout>


      <Typography
        variant="h4"
        fontWeight={800}
      >
        Inventory overview
      </Typography>



      <Typography
        color="text.secondary"
        mb={3}
      >
        Monitor stock levels and record every movement.
      </Typography>





      <Grid
        container
        spacing={2}
        mb={3}
      >


        {
          cards.map(
            ([label, value]) => (

              <Grid

                key={String(label)}

                size={{
                  xs: 6,
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

                      variant="h5"

                      fontWeight={800}

                    >

                      {value ?? 0}


                    </Typography>



                  </CardContent>


                </Card>


              </Grid>

            )
          )
        }


      </Grid>








      <Grid

        container

        spacing={2}

        mb={3}

      >



        <Grid

          size={{
            xs:12,
            md:7,
          }}

        >

          <Chart

            title="Inventory by category"

            data={
              charts.data
                ?.inventory_by_category ?? []
            }

          />


        </Grid>





        <Grid

          size={{
            xs:12,
            md:5,
          }}

        >

          <Chart

            title="Stock status distribution"

            data={
              charts.data
                ?.stock_status_distribution ?? []
            }

          />


        </Grid>



      </Grid>








      <Card variant="outlined">


        <CardContent>



          <Stack

            direction={{

              xs:"column",

              md:"row",

            }}

            spacing={1}

            mb={2}

          >



            <TextField

              label="Search product or SKU"

              value={search}

              onChange={(event)=>

                setSearch(
                  event.target.value
                )

              }

              fullWidth

            />






            <Select

              value={categoryId}

              displayEmpty

              onChange={(event)=>

                setCategoryId(
                  event.target.value
                )

              }

            >


              <MenuItem value="">

                All categories

              </MenuItem>



              {
                categories.data?.map(
                  (category)=>(


                    <MenuItem

                      value={
                        String(category.id)
                      }

                      key={
                        category.id
                      }

                    >

                      {category.name}


                    </MenuItem>


                  )
                )
              }



            </Select>







            <TextField

              label="Brand"

              value={brand}

              onChange={(event)=>

                setBrand(
                  event.target.value
                )

              }

            />








            <Select

              value={status}

              displayEmpty

              onChange={(event)=>

                setStatus(
                  event.target.value
                )

              }

            >


              <MenuItem value="">

                All statuses

              </MenuItem>



              <MenuItem value="IN_STOCK">

                In Stock

              </MenuItem>



              <MenuItem value="LOW_STOCK">

                Low Stock

              </MenuItem>



              <MenuItem value="OUT_OF_STOCK">

                Out of Stock

              </MenuItem>



            </Select>








            <Select

              value={sort}

              onChange={(event)=>

                setSort(
                  event.target.value
                )

              }

            >


              <MenuItem value="updated">

                Recently Updated

              </MenuItem>



              <MenuItem value="name">

                Product Name

              </MenuItem>



              <MenuItem value="stock">

                Current Stock

              </MenuItem>



            </Select>



          </Stack>









          <Stack spacing={1}>


            {

              inventory.data?.map(

                (item)=>(


                  <Card

                    key={
                      item.id
                    }

                    variant="outlined"

                  >



                    <CardContent


                      sx={{

                        display:
                          "flex",

                        gap:
                          2,

                        alignItems:
                          "center",

                        flexWrap:
                          "wrap",

                      }}

                    >



                      <Box

                        sx={{

                          flexGrow:
                            1,

                        }}

                      >



                        <Typography

                          fontWeight={700}

                        >

                          {
                            item.product_name
                          }

                          {" · "}

                          {
                            item.sku
                          }


                        </Typography>






                        <Typography

                          variant="body2"

                          color="text.secondary"

                        >

                          {
                            item.category_name
                          }

                          {" · "}


                          {
                            item.brand ||
                            "Unbranded"
                          }


                          {" · Current "}


                          {
                            item.current_stock
                          }


                          {" · Reserved "}


                          {
                            item.reserved_stock
                          }


                          {" · Available "}


                          {
                            item.available_stock
                          }


                          {" · Reorder "}


                          {
                            item.reorder_level
                          }



                        </Typography>



                      </Box>







                      <Chip

                        label={

                          item.stock_status.replace(
                            "_",
                            " "
                          )

                        }


                        color={

                          item.stock_status ===
                          "IN_STOCK"

                            ? "success"

                            : item.stock_status ===
                              "LOW_STOCK"

                            ? "warning"

                            : "error"

                        }


                        size="small"

                      />








                      <Button

                        size="small"

                        onClick={()=>

                          setHistory(item)

                        }

                      >

                        History


                      </Button>







                      {

                        admin && (


                          <Button

                            size="small"

                            variant="contained"

                            onClick={() => {

                              setError("");

                              setSelected(item);

                            }}

                          >

                            Adjust


                          </Button>


                        )

                      }







                    </CardContent>



                  </Card>



                )

              )


            }


          </Stack>






        </CardContent>


      </Card>

      <Dialog

        open={Boolean(selected)}

        onClose={() =>
          setSelected(null)
        }

        fullWidth

        maxWidth="sm"

      >


        <DialogTitle>

          Adjust {selected?.product_name}

        </DialogTitle>




        <DialogContent>


          <Stack

            spacing={2}

            mt={1}

          >


            {

              error && (

                <Alert severity="error">

                  {error}

                </Alert>

              )

            }




            <Select

              value={
                adjustment.adjustment_type
              }


              onChange={(event) =>

                setAdjustment({

                  ...adjustment,

                  adjustment_type:
                    event.target.value,

                })

              }

            >


              <MenuItem value="STOCK_IN">

                Stock In

              </MenuItem>



              <MenuItem value="STOCK_OUT">

                Stock Out

              </MenuItem>



              <MenuItem value="MANUAL_ADJUSTMENT">

                Manual Adjustment

              </MenuItem>



            </Select>






            <TextField

              label="Quantity"

              type="number"

              value={
                adjustment.quantity
              }

              onChange={(event) =>

                setAdjustment({

                  ...adjustment,

                  quantity:
                    Number(
                      event.target.value
                    ),

                })

              }

            />






            <TextField

              label="Reason"

              value={
                adjustment.reason
              }


              onChange={(event) =>

                setAdjustment({

                  ...adjustment,

                  reason:
                    event.target.value,

                })

              }


              required

            />






            <TextField

              label="Remarks"

              value={
                adjustment.remarks
              }


              onChange={(event) =>

                setAdjustment({

                  ...adjustment,

                  remarks:
                    event.target.value,

                })

              }


              multiline

              minRows={2}

            />




          </Stack>


        </DialogContent>






        <DialogActions>


          <Button

            onClick={() =>
              setSelected(null)
            }

          >

            Cancel


          </Button>





          <Button


            disabled={

              !adjustment.reason ||

              adjustment.quantity < 1

            }


            variant="contained"


            onClick={() =>
              adjust.mutate()
            }

          >

            Save adjustment


          </Button>



        </DialogActions>



      </Dialog>









      <Dialog


        open={Boolean(history)}


        onClose={() =>
          setHistory(null)
        }


        fullWidth


        maxWidth="sm"


      >



        <DialogTitle>


          {history?.product_name}

          {" — movement history"}


        </DialogTitle>






        <DialogContent>


          <Stack spacing={1}>


            {

              moves.data?.map(

                (move) => (


                  <Card

                    key={
                      move.id
                    }

                    variant="outlined"

                  >



                    <CardContent>



                      <Typography

                        fontWeight={700}

                      >

                        {
                          move.movement_type.replace(
                            "_",
                            " "
                          )
                        }


                        {" · "}


                        {

                          move.quantity_changed > 0

                            ? "+"

                            : ""

                        }


                        {
                          move.quantity_changed
                        }


                      </Typography>







                      <Typography

                        variant="body2"

                      >

                        {
                          move.previous_quantity
                        }


                        {" → "}


                        {
                          move.updated_quantity
                        }


                        {" · "}


                        {
                          move.reason
                        }


                      </Typography>







                      <Typography

                        variant="caption"

                        color="text.secondary"

                      >

                        {
                          new Date(
                            move.created_at
                          ).toLocaleString()
                        }


                      </Typography>





                    </CardContent>



                  </Card>


                )

              )

            }



          </Stack>


        </DialogContent>







        <DialogActions>


          <Button

            onClick={() =>
              setHistory(null)
            }

          >

            Close


          </Button>


        </DialogActions>



      </Dialog>





    </DashboardLayout>


  );


}









function Chart({

  title,

  data,

}: {

  title: string;

  data: {

    category?: string;

    status?: string;

    quantity?: number;

    count?: number;

  }[];

}) {



  const maximum = Math.max(

    ...

    data.map(

      (item) =>

        item.quantity ??
        item.count ??
        0

    ),

    1

  );





  return (


    <Card variant="outlined">


      <CardContent>


        <Typography

          fontWeight={700}

          mb={2}

        >

          {title}


        </Typography>





        <Stack spacing={1.5}>


          {

            data.map(

              (row,index)=>{


                const value =

                  row.quantity ??
                  row.count ??
                  0;



                const label =

                  row.category ??

                  row.status?.replace(
                    "_",
                    " "
                  ) ??

                  `Item ${index + 1}`;





                return (

                  <Box

                    key={`${label}-${index}`}

                  >



                    <Stack

                      direction="row"

                      justifyContent="space-between"

                    >


                      <Typography

                        variant="body2"

                      >

                        {label}


                      </Typography>





                      <Typography

                        variant="body2"

                        fontWeight={700}

                      >

                        {value}


                      </Typography>


                    </Stack>






                    <Box


                      sx={{

                        height:8,

                        mt:.5,

                        bgcolor:
                          "grey.100",

                        borderRadius:9,

                        overflow:"hidden",

                      }}


                    >


                      <Box


                        sx={{

                          height:"100%",


                          width:
                            `${

                              (value / maximum) *

                              100

                            }%`,


                          bgcolor:

                            index % 2

                              ? "secondary.main"

                              : "primary.main",

                        }}


                      />


                    </Box>





                  </Box>


                );


              }


            )

          }


        </Stack>


      </CardContent>


    </Card>


  );


}