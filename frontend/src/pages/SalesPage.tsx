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
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";


import {
  catalogApi,
  type Product,
} from "../api/catalogApi";


import {
  salesApi,
  type Sale,
  type SaleItem,
  type SalePayload,
} from "../api/salesApi";


import { DashboardLayout } from "../layouts/DashboardLayout";





const newLine = (): SaleItem => ({

  product_id: 0,

  quantity: 1,

  unit_price: 0,

  discount: 0,

  tax: 0,

});





const blankSale = (): SalePayload => ({

  customer_name: "",

  sale_date:
    new Date()
      .toISOString()
      .slice(0, 16),

  sales_channel:
    "RETAIL_STORE",

  payment_method:
    "CASH",

  items: [

    newLine(),

  ],

});





const apiError = (error: unknown) => {

  const value = (

    error as {

      response?: {

        data?: {

          detail?: unknown;

        };

      };

    }

  )?.response?.data?.detail;



  if (typeof value === "string") {

    return value;

  }



  if (Array.isArray(value)) {

    return value

      .map(

        (item: { msg?: string }) =>

          item.msg

      )

      .join(", ");

  }



  return "Unable to save the sale.";

};








export function SalesPage() {


  const client = useQueryClient();



  const [
    open,
    setOpen,
  ] = useState(false);



  const [
    editing,
    setEditing,
  ] = useState<Sale | null>(null);



  const [
    details,
    setDetails,
  ] = useState<Sale | null>(null);



  const [
    error,
    setError,
  ] = useState("");



  const [
    form,
    setForm,
  ] = useState<SalePayload>(
    blankSale()
  );




  const [
    filters,
    setFilters,
  ] = useState({

    search: "",

    channel: "",

    payment: "",

    categoryId: "",

    dateFrom: "",

    dateTo: "",

    sort: "date",

  });








  const products = useQuery({


    queryKey: [

      "sale-products",

    ],



    queryFn: () =>

      catalogApi

        .products({

          status: "ACTIVE",

          sort: "name",

        })

        .then(

          (response) =>

            response.data

        ),


  });








  const categories = useQuery({


    queryKey: [

      "sale-categories",

    ],



    queryFn: () =>

      catalogApi

        .categories()

        .then(

          (response) =>

            response.data

        ),


  });








  const sales = useQuery({


    queryKey: [

      "sales",

      filters,

    ],



    queryFn: () =>


      salesApi

        .list({

          search:

            filters.search,



          sales_channel:

            filters.channel ||

            undefined,



          payment_method:

            filters.payment ||

            undefined,



          category_id:

            filters.categoryId ||

            undefined,



          date_from:

            filters.dateFrom ||

            undefined,



          date_to:

            filters.dateTo

              ? `${filters.dateTo}T23:59:59`

              : undefined,



          sort:

            filters.sort,

        })

        .then(

          (response) =>

            response.data

        ),


  });








  const summary = useQuery({


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








  const save = useMutation({


    mutationFn: () =>


      editing

        ? salesApi.update(

            editing.id,

            form

          )

        : salesApi.create(

            form

          ),





    onSuccess: () => {


      const keys = [

        "sales",

        "sales-summary",

        "catalog-summary",

        "products",

        "inventory",

        "inventory-summary",

      ];



      keys.forEach(

        (key) =>

          client.invalidateQueries({

            queryKey:[key],

          })

      );



      setOpen(false);


    },





    onError: (error) => {


      setError(

        apiError(error)

      );


    },


  });








  const remove = useMutation({


    mutationFn: (id:number) =>

      salesApi.delete(id),




    onSuccess: () => {


      const keys = [

        "sales",

        "sales-summary",

        "catalog-summary",

        "products",

        "inventory",

        "inventory-summary",

      ];



      keys.forEach(

        (key) =>

          client.invalidateQueries({

            queryKey:[key],

          })

      );


    },


  });








  const openForm = (

    sale?: Sale

  ) => {


    setError("");



    setEditing(

      sale ?? null

    );



    setForm(

      sale

        ? {

            customer_name:

              sale.customer_name,


            sale_date:

              sale.sale_date.slice(
                0,
                16
              ),


            sales_channel:

              sale.sales_channel,


            payment_method:

              sale.payment_method,


            items:

              sale.items.map(

                (item) => ({

                  product_id:

                    item.product_id,


                  quantity:

                    item.quantity,


                  unit_price:

                    item.unit_price,


                  discount:

                    item.discount,


                  tax:

                    item.tax,


                })

              ),

          }


        : blankSale()

    );



    setOpen(true);


  };








  const cards = [

    [

      "Total sales",

      `₹${(

        summary.data?.total_sales ??

        0

      ).toFixed(2)}`,

    ],


    [

      "Total revenue",

      `₹${(

        summary.data?.total_revenue ??

        0

      ).toFixed(2)}`,

    ],


    [

      "Total orders",

      summary.data?.total_orders ?? 0,

    ],


    [

      "Average order value",

      `₹${(

        summary.data?.average_order_value ??

        0

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

        mb={3}

      >


        <Box>


          <Typography

            variant="h4"

            fontWeight={800}

          >

            Sales transactions

          </Typography>




          <Typography

            color="text.secondary"

          >

            Record sales and keep inventory accurate in real time.

          </Typography>



        </Box>






        <Button

          variant="contained"

          onClick={() =>
            openForm()
          }

        >

          New sale


        </Button>



      </Stack>









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

                  xs:6,

                  md:3,

                }}

              >


                <Card

                  variant="outlined"

                >


                  <CardContent>



                    <Typography

                      variant="body2"

                      color="text.secondary"

                    >

                      {label}


                    </Typography>





                    <Typography

                      variant="h5"

                      fontWeight={800}

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

      >


        <CardContent>



          <FilterBar

            filters={filters}

            setFilters={setFilters}

            categories={
              categories.data ?? []
            }

          />








          <Stack spacing={1}>


            {

              sales.isLoading ? (


                <Typography>

                  Loading sales...

                </Typography>



              ) : (


                sales.data?.map(

                  (sale) => (


                    <SaleRow


                      key={
                        sale.id
                      }


                      sale={sale}



                      details={() =>
                        setDetails(sale)
                      }



                      edit={() =>
                        openForm(sale)
                      }



                      remove={() => {


                        if (

                          window.confirm(

                            `Delete ${sale.invoice_number}? Stock will be restored.`

                          )

                        ) {


                          remove.mutate(

                            sale.id

                          );


                        }


                      }}


                    />


                  )


                )



              )

            }



          </Stack>



        </CardContent>



      </Card>








      <SaleEditor


        open={open}


        close={() =>
          setOpen(false)
        }


        form={form}


        setForm={setForm}


        products={
          products.data ?? []
        }


        error={error}


        saving={
          save.isPending
        }


        submit={() =>
          save.mutate()
        }


        editing={
          Boolean(editing)
        }


      />








      <SaleDetails


        sale={details}


        close={() =>
          setDetails(null)
        }


      />



    </DashboardLayout>


  );



}









function FilterBar({

  filters,

  setFilters,

  categories,

}: {


  filters: {

    search:string;

    channel:string;

    payment:string;

    categoryId:string;

    dateFrom:string;

    dateTo:string;

    sort:string;

  };


  setFilters:

    (value:any)=>void;



  categories:

    {

      id:number;

      name:string;

    }[];



}) {


  const set = (

    key:string,

    value:string

  ) => {


    setFilters({

      ...filters,

      [key]:value,

    });


  };





  return (


    <Stack

      spacing={1}

      mb={2}

    >



      <Stack

        direction={{

          xs:"column",

          md:"row",

        }}

        spacing={1}

      >



        <TextField


          label="Invoice, customer or product"


          value={
            filters.search
          }


          onChange={(event) =>

            set(

              "search",

              event.target.value

            )

          }


          fullWidth


        />






        <TextField


          label="From date"


          type="date"


          value={
            filters.dateFrom
          }


          onChange={(event) =>

            set(

              "dateFrom",

              event.target.value

            )

          }


          InputLabelProps={{

            shrink:true,

          }}


        />







        <TextField


          label="To date"


          type="date"


          value={
            filters.dateTo
          }


          onChange={(event) =>

            set(

              "dateTo",

              event.target.value

            )

          }


          InputLabelProps={{

            shrink:true,

          }}


        />








        <Select


          displayEmpty


          value={
            filters.categoryId
          }


          onChange={(event) =>

            set(

              "categoryId",

              event.target.value

            )

          }


        >



          <MenuItem value="">

            All categories

          </MenuItem>





          {

            categories.map(

              (category)=>(


                <MenuItem

                  key={
                    category.id
                  }


                  value={
                    String(category.id)
                  }


                >

                  {category.name}


                </MenuItem>


              )

            )

          }




        </Select>



      </Stack>








      <Stack

        direction={{

          xs:"column",

          md:"row",

        }}

        spacing={1}

      >



        <Select


          displayEmpty


          value={
            filters.channel
          }


          onChange={(event) =>

            set(

              "channel",

              event.target.value

            )

          }


        >


          <MenuItem value="">

            All channels

          </MenuItem>



          <MenuItem value="RETAIL_STORE">

            Retail Store

          </MenuItem>



          <MenuItem value="ONLINE_STORE">

            Online Store

          </MenuItem>



          <MenuItem value="MARKETPLACE">

            Marketplace

          </MenuItem>


        </Select>








        <Select


          displayEmpty


          value={
            filters.payment
          }


          onChange={(event) =>

            set(

              "payment",

              event.target.value

            )

          }


        >


          <MenuItem value="">

            All payments

          </MenuItem>



          <MenuItem value="CASH">

            Cash

          </MenuItem>



          <MenuItem value="CARD">

            Card

          </MenuItem>



          <MenuItem value="UPI">

            UPI

          </MenuItem>



          <MenuItem value="BANK_TRANSFER">

            Bank Transfer

          </MenuItem>


        </Select>








        <Select


          value={
            filters.sort
          }


          onChange={(event)=>

            set(

              "sort",

              event.target.value

            )

          }


        >


          <MenuItem value="date">

            Date

          </MenuItem>



          <MenuItem value="invoice">

            Invoice

          </MenuItem>



          <MenuItem value="total">

            Total amount

          </MenuItem>



        </Select>



      </Stack>


    </Stack>


  );


}
function SaleRow({
  sale,
  details,
  edit,
  remove,
}: {
  sale: Sale;
  details: () => void;
  edit: () => void;
  remove: () => void;
}) {

  return (

    <Card variant="outlined">

      <CardContent>


        <Stack

          direction={{

            xs: "column",

            sm: "row",

          }}

          spacing={1}

          alignItems={{

            sm: "center",

          }}

        >



          <Box

            sx={{

              flexGrow: 1,

            }}

          >


            <Typography

              fontWeight={700}

            >

              {sale.invoice_number}

              {" · "}

              {sale.customer_name}


            </Typography>





            <Typography

              variant="body2"

              color="text.secondary"

            >

              {

                new Date(

                  sale.sale_date

                ).toLocaleString()

              }


              {" · "}


              {

                sale.items

                  .map(

                    (item) =>

                      item.product_name

                  )

                  .join(", ")

              }


            </Typography>



          </Box>






          <Stack

            direction="row"

            spacing={1}

            alignItems="center"

            flexWrap="wrap"

          >



            <Chip

              label={

                sale.sales_channel.replace(

                  "_",

                  " "

                )

              }

              size="small"

            />






            <Typography

              fontWeight={800}

            >

              ₹

              {

                sale.total_amount.toFixed(

                  2

                )

              }


            </Typography>






            <Button

              size="small"

              onClick={details}

            >

              Details


            </Button>






            <Button

              size="small"

              onClick={edit}

            >

              Edit


            </Button>






            <Button

              size="small"

              color="error"

              onClick={remove}

            >

              Delete


            </Button>



          </Stack>



        </Stack>



      </CardContent>


    </Card>


  );

}









function SaleEditor({

  open,

  close,

  form,

  setForm,

  products,

  error,

  saving,

  submit,

  editing,

}: {

  open:boolean;

  close:()=>void;

  form:SalePayload;

  setForm:(value:SalePayload)=>void;

  products:Product[];

  error:string;

  saving:boolean;

  submit:()=>void;

  editing:boolean;

}) {



  const updateLine = (

    index:number,

    update:Partial<SaleItem>

  ) => {


    setForm({

      ...form,

      items:

        form.items.map(

          (line,current)=>

            current === index

              ? {

                  ...line,

                  ...update,

                }

              : line

        ),


    });


  };







  const total =

    form.items.reduce(

      (

        sum,

        line

      ) =>


        sum +

        line.quantity *

        line.unit_price -

        line.discount +

        line.tax,


      0

    );







  return (


    <Dialog


      open={open}


      onClose={close}


      fullWidth


      maxWidth="md"


    >



      <DialogTitle>


        {

          editing

            ? "Edit sale"

            : "Create sale"

        }


      </DialogTitle>







      <DialogContent>



        <Grid

          container

          spacing={2}

          sx={{

            pt:1,

          }}

        >



          {

            error && (


              <Grid size={12}>


                <Alert severity="error">

                  {error}


                </Alert>


              </Grid>


            )

          }







          <FormField

            label="Customer name"

            value={

              form.customer_name

            }

            onChange={

              (value)=>

                setForm({

                  ...form,

                  customer_name:value,

                })

            }

          />







          <FormField

            label="Sale date and time"

            type="datetime-local"

            value={

              form.sale_date ?? ""

            }

            onChange={

              (value)=>

                setForm({

                  ...form,

                  sale_date:value,

                })

            }

          />








          <Grid

            size={{

              xs:12,

              sm:6,

            }}

          >


            <FormControl fullWidth>


              <InputLabel>

                Sales channel

              </InputLabel>



              <Select

                label="Sales channel"

                value={

                  form.sales_channel

                }

                onChange={(event)=>

                  setForm({

                    ...form,

                    sales_channel:

                      event.target.value,

                  })

                }

              >


                <MenuItem value="RETAIL_STORE">

                  Retail Store

                </MenuItem>


                <MenuItem value="ONLINE_STORE">

                  Online Store

                </MenuItem>



                <MenuItem value="MARKETPLACE">

                  Marketplace

                </MenuItem>



              </Select>



            </FormControl>


          </Grid>







          <Grid

            size={{

              xs:12,

              sm:6,

            }}

          >


            <FormControl fullWidth>


              <InputLabel>

                Payment method

              </InputLabel>



              <Select

                label="Payment method"

                value={

                  form.payment_method

                }


                onChange={(event)=>

                  setForm({

                    ...form,

                    payment_method:

                      event.target.value,

                  })

                }


              >



                <MenuItem value="CASH">

                  Cash

                </MenuItem>



                <MenuItem value="CARD">

                  Card

                </MenuItem>



                <MenuItem value="UPI">

                  UPI

                </MenuItem>



                <MenuItem value="BANK_TRANSFER">

                  Bank Transfer

                </MenuItem>



              </Select>


            </FormControl>


          </Grid>








          <Grid size={12}>


            <Typography

              fontWeight={700}

            >

              Sale items


            </Typography>


          </Grid>








          {

            form.items.map(

              (line,index)=>(


                <SaleLine


                  key={index}


                  index={index}


                  line={line}


                  products={products}


                  update={updateLine}


                  remove={()=>

                    setForm({

                      ...form,

                      items:

                        form.items.filter(

                          (_,current)=>

                            current !== index

                        ),

                    })

                  }


                  canRemove={

                    form.items.length > 1

                  }


                />


              )


            )

          }






        </Grid>







        <Button

          sx={{

            mt:2,

          }}

          variant="outlined"

          onClick={()=>

            setForm({

              ...form,

              items:[

                ...form.items,

                newLine(),

              ],

            })

          }

        >

          Add another product


        </Button>







        <Alert

          severity="info"

          sx={{

            mt:2,

          }}

        >

          Final amount:

          {" ₹"}

          {

            total.toFixed(2)

          }


        </Alert>




      </DialogContent>







      <DialogActions>


        <Button onClick={close}>

          Cancel

        </Button>





        <Button

          disabled={

            !form.customer_name ||

            form.items.some(

              (line)=>

                !line.product_id ||

                line.quantity < 1

            ) ||

            saving

          }

          variant="contained"

          onClick={submit}

        >

          {

            editing

              ? "Save changes"

              : "Create sale"

          }


        </Button>



      </DialogActions>



    </Dialog>


  );

}
function SaleLine({
  index,
  line,
  products,
  update,
  remove,
  canRemove,
}: {
  index: number;
  line: SaleItem;
  products: Product[];
  update: (
    index: number,
    value: Partial<SaleItem>
  ) => void;
  remove: () => void;
  canRemove: boolean;
}) {
  const product = products.find(
    (item) => item.id === line.product_id
  );

  return (
    <Grid size={12}>
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
          >
            <Typography fontWeight={700}>
              Product {index + 1}
            </Typography>

            {canRemove && (
              <Button
                color="error"
                size="small"
                onClick={remove}
              >
                Remove
              </Button>
            )}
          </Stack>


          <Grid
            container
            spacing={1}
            mt={0.5}
          >

            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <FormControl fullWidth>

                <InputLabel>
                  Product
                </InputLabel>

                <Select
                  label="Product"
                  value={
                    line.product_id || ""
                  }
                  onChange={(event) => {

                    const selected =
                      products.find(
                        (item) =>
                          item.id ===
                          Number(event.target.value)
                      );

                    update(
                      index,
                      {
                        product_id:
                          Number(event.target.value),

                        unit_price:
                          selected?.unit_price ?? 0,
                      }
                    );

                  }}
                >

                  {
                    products.map((item) => (

                      <MenuItem
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                        {" · Stock "}
                        {item.stock_quantity}
                      </MenuItem>

                    ))
                  }

                </Select>

              </FormControl>
            </Grid>



            <FormField
              label="Category"
              value={
                product?.category_name ??
                "Select product"
              }
              disabled
              onChange={() => {}}
            />


            <FormField
              label="Quantity"
              type="number"
              value={
                String(line.quantity)
              }
              onChange={(value) =>
                update(
                  index,
                  {
                    quantity:
                      Number(value),
                  }
                )
              }
            />


            <FormField
              label="Unit price"
              type="number"
              value={
                String(line.unit_price)
              }
              onChange={(value) =>
                update(
                  index,
                  {
                    unit_price:
                      Number(value),
                  }
                )
              }
            />


            <FormField
              label="Discount"
              type="number"
              value={
                String(line.discount)
              }
              onChange={(value) =>
                update(
                  index,
                  {
                    discount:
                      Number(value),
                  }
                )
              }
            />


            <FormField
              label="Tax"
              type="number"
              value={
                String(line.tax)
              }
              onChange={(value) =>
                update(
                  index,
                  {
                    tax:
                      Number(value),
                  }
                )
              }
            />

          </Grid>

        </CardContent>
      </Card>
    </Grid>
  );
}



function FormField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {

  return (
    <Grid
      size={{
        xs: 12,
        sm: 6,
      }}
    >

      <TextField
        label={label}
        type={type}
        value={value}

        onChange={(event) =>
          onChange(
            event.target.value
          )
        }

        disabled={disabled}

        fullWidth

        InputLabelProps={
          type === "datetime-local"
            ? {
                shrink: true,
              }
            : undefined
        }
      />

    </Grid>
  );
}




function SaleDetails({
  sale,
  close,
}: {
  sale: Sale | null;
  close: () => void;
}) {

  if (!sale) {
    return null;
  }


  return (

    <Dialog
      open
      onClose={close}
      fullWidth
      maxWidth="sm"
    >

      <DialogTitle>
        Invoice {sale.invoice_number}
      </DialogTitle>


      <DialogContent>

        <Stack spacing={1}>

          <Typography>
            <b>Customer:</b>{" "}
            {sale.customer_name}
          </Typography>


          <Typography>
            <b>Date:</b>{" "}
            {
              new Date(
                sale.sale_date
              ).toLocaleString()
            }
          </Typography>


          <Typography>
            <b>Channel:</b>{" "}
            {
              sale.sales_channel.replace(
                "_",
                " "
              )
            }
          </Typography>


          <Typography>
            <b>Payment:</b>{" "}
            {
              sale.payment_method.replace(
                "_",
                " "
              )
            }
          </Typography>



          {
            sale.items.map((item) => (

              <Card
                key={item.id}
                variant="outlined"
              >

                <CardContent>

                  <Typography fontWeight={700}>
                    {item.product_name}
                    {" · "}
                    {item.category_name}
                  </Typography>


                  <Typography
                    variant="body2"
                  >
                    Quantity:
                    {" "}
                    {item.quantity}

                    {" × ₹"}

                    {item.unit_price}

                    {" · Discount: ₹"}

                    {item.discount}

                    {" · Tax: ₹"}

                    {item.tax}

                  </Typography>


                  <Typography fontWeight={800}>
                    Final: ₹
                    {
                      item.total?.toFixed(2)
                    }
                  </Typography>

                </CardContent>

              </Card>

            ))
          }



          <Typography variant="h6">
            Total Amount:
            {" "}
            ₹
            {
              sale.total_amount.toFixed(2)
            }
          </Typography>


        </Stack>

      </DialogContent>



      <DialogActions>

        <Button onClick={close}>
          Close
        </Button>

      </DialogActions>


    </Dialog>

  );

}