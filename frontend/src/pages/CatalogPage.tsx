import { useState } from "react";

import {
  useQuery,
  useQueryClient,
  useMutation,
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

import {
  catalogApi,
  type Category,
  type CategoryPayload,
  type Product,
  type ProductPayload,
} from "../api/catalogApi";

import { DashboardLayout } from "../layouts/DashboardLayout";

import { useSearchParams } from "react-router-dom";


const blankCategory: CategoryPayload = {
  name: "",
  description: "",
  status: "ACTIVE",
};


const blankProduct: ProductPayload = {
  name: "",
  sku: "",
  category_id: 0,
  brand: "",
  description: "",
  unit_price: 0,
  cost_price: 0,
  stock_quantity: 0,
  unit_of_measure: "Unit",
  status: "ACTIVE",
};


const errorMessage = (error: unknown) => {

  const detail = (
    error as {
      response?: {
        data?: {
          detail?: unknown;
        };
      };
    }
  )?.response?.data?.detail;


  if (typeof detail === "string") {
    return detail;
  }


  if (Array.isArray(detail)) {

    return detail
      .map(
        (item: { msg?: string }) =>
          item.msg ?? "Invalid value"
      )
      .join(", ");

  }


  return "Something went wrong. Please try again.";

};




export function CatalogPage() {

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();


  const tab =
    searchParams.get("tab") === "products"
      ? 1
      : 0;


  const setTab = (value: number) => {

    setSearchParams({
      tab:
        value === 1
          ? "products"
          : "categories",
    });

  };



  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [categoryId, setCategoryId] =
    useState("");

  const [brand, setBrand] =
    useState("");

  const [sort, setSort] =
    useState("recent");




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




  const categories = useQuery({

    queryKey: [
      "categories",
      search,
    ],

    queryFn: () =>
      catalogApi
        .categories(search)
        .then(
          (response) =>
            response.data
        ),

  });




  const products = useQuery({

    queryKey: [
      "products",
      search,
      status,
      categoryId,
      brand,
      sort,
    ],


    queryFn: () =>
      catalogApi
        .products({

          search,

          status:
            status || undefined,

          category_id:
            categoryId || undefined,

          brand,

          sort,

        })
        .then(
          (response) =>
            response.data
        ),

  });




  const cards = [

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




  return (

    <DashboardLayout>


      <Stack

        direction={{
          xs: "column",
          md: "row",
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
            Catalog management
          </Typography>


          <Typography color="text.secondary">

            Manage product master data for your organization.

          </Typography>


        </Box>




        <Button

          variant="contained"

          onClick={() =>
            setTab(
              tab === 0
                ? 1
                : 0
            )
          }

        >

          Add{" "}

          {
            tab === 0
              ? "category"
              : "product"
          }


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

                key={label}

                size={{
                  xs: 6,
                  md: 3,
                }}

              >

                <Card variant="outlined">

                  <CardContent>


                    <Typography

                      variant="body2"

                      color="text.secondary"

                    >

                      {label}

                    </Typography>



                    <Typography

                      variant="h4"

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





      <Card variant="outlined">


        <Tabs

          value={tab}

          onChange={(_, value) =>
            setTab(value)
          }

          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}

        >

          <Tab label="Categories" />

          <Tab label="Products" />


        </Tabs>





        <Box

          p={{
            xs: 2,
            md: 3,
          }}

        >


          {
            tab === 0 ? (

              <CategoriesPanel

                categories={
                  categories.data ?? []
                }

                loading={
                  categories.isLoading
                }

                error={
                  categories.error
                    ? errorMessage(categories.error)
                    : ""
                }

              />


            ) : (


              <ProductsPanel

                products={
                  products.data ?? []
                }

                categories={
                  categories.data ?? []
                }

                loading={
                  products.isLoading
                }

                error={
                  products.error
                    ? errorMessage(products.error)
                    : ""
                }


                filters={{

                  search,

                  status,

                  categoryId,

                  brand,

                  sort,

                }}


                setFilters={{

                  setSearch,

                  setStatus,

                  setCategoryId,

                  setBrand,

                  setSort,

                }}

              />


            )
          }


        </Box>


      </Card>



    </DashboardLayout>

  );

}
function CategoriesPanel({
  categories,
  loading,
  error,
}: {
  categories: Category[];
  loading: boolean;
  error: string;
}) {

  const client = useQueryClient();


  const [form, setForm] =
    useState<CategoryPayload>(blankCategory);


  const [editing, setEditing] =
    useState<Category | null>(null);


  const [message, setMessage] =
    useState("");




  const save = useMutation({

    mutationFn: () =>

      editing

        ? catalogApi.updateCategory(
            editing.id,
            form
          )

        : catalogApi.createCategory(
            form
          ),



    onSuccess: () => {

      client.invalidateQueries({
        queryKey: [
          "categories",
        ],
      });


      client.invalidateQueries({
        queryKey: [
          "catalog-summary",
        ],
      });


      setForm(blankCategory);


      setEditing(null);


      setMessage(
        "Category saved successfully."
      );

    },



    onError: (error) => {

      setMessage(
        errorMessage(error)
      );

    },

  });





  const remove = useMutation({

    mutationFn: (id: number) =>

      catalogApi.deleteCategory(id),



    onSuccess: () => {

      client.invalidateQueries({
        queryKey: [
          "categories",
        ],
      });


      client.invalidateQueries({
        queryKey: [
          "catalog-summary",
        ],
      });

    },



    onError: (error) => {

      setMessage(
        errorMessage(error)
      );

    },

  });





  return (

    <Stack spacing={3}>


      <Stack

        direction={{
          xs: "column",
          md: "row",
        }}

        spacing={2}

      >


        <TextField

          label="Category name"

          value={
            form.name
          }


          onChange={(event) =>

            setForm({

              ...form,

              name:
                event.target.value,

            })

          }


          fullWidth

        />





        <TextField

          label="Description"


          value={
            form.description
          }


          onChange={(event) =>

            setForm({

              ...form,

              description:
                event.target.value,

            })

          }


          fullWidth

        />





        <FormControl

          sx={{
            minWidth: 150,
          }}

        >


          <InputLabel>
            Status
          </InputLabel>



          <Select

            label="Status"

            value={
              form.status
            }


            onChange={(event) =>

              setForm({

                ...form,

                status:
                  event.target.value,

              })

            }

          >


            <MenuItem value="ACTIVE">
              Active
            </MenuItem>



            <MenuItem value="INACTIVE">
              Inactive
            </MenuItem>



          </Select>


        </FormControl>





        <Button

          disabled={
            !form.name ||
            save.isPending
          }


          variant="contained"


          onClick={() =>
            save.mutate()
          }

        >

          {
            editing
              ? "Update"
              : "Create"
          }


        </Button>





        {

          editing && (

            <Button

              onClick={() => {

                setEditing(null);

                setForm(
                  blankCategory
                );

              }}

            >

              Cancel


            </Button>

          )

        }



      </Stack>





      {

        message && (


          <Alert

            severity={

              message.includes(
                "success"
              )

                ? "success"

                : "error"

            }

          >

            {message}


          </Alert>


        )

      }






      {

        error && (


          <Alert severity="error">

            {error}

          </Alert>


        )

      }







      <Stack spacing={1}>


        {

          loading ? (


            <Typography>

              Loading categories...

            </Typography>



          ) : (



            categories.map(
              (category) => (


                <Card

                  key={
                    category.id
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



                      <Typography fontWeight={700}>

                        {
                          category.name
                        }


                      </Typography>




                      <Typography

                        variant="body2"

                        color="text.secondary"

                      >


                        {
                          category.description ||
                          "No description"
                        }


                        {" · "}


                        {
                          category.product_count
                        }


                        {" products"}


                      </Typography>



                    </Box>





                    <Chip

                      label={
                        category.status
                      }


                      color={

                        category.status ===
                        "ACTIVE"

                          ? "success"

                          : "default"

                      }


                      size="small"

                    />





                    <Button

                      size="small"


                      onClick={() => {


                        setEditing(
                          category
                        );


                        setForm({

                          name:
                            category.name,


                          description:

                            category.description ??
                            "",


                          status:
                            category.status,


                        });


                      }}

                    >

                      Edit


                    </Button>





                    <Button

                      size="small"


                      color="error"


                      onClick={() => {


                        if (

                          window.confirm(

                            `Delete ${category.name}?`

                          )

                        ) {


                          remove.mutate(
                            category.id
                          );


                        }


                      }}


                    >

                      Delete


                    </Button>





                  </CardContent>



                </Card>



              )

            )


          )

        }


      </Stack>



    </Stack>


  );

}
function ProductsPanel({
  products,
  categories,
  loading,
  error,
  filters,
  setFilters,
}: {
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: string;

  filters: {
    search: string;
    status: string;
    categoryId: string;
    brand: string;
    sort: string;
  };

  setFilters: {
    setSearch: (value: string) => void;
    setStatus: (value: string) => void;
    setCategoryId: (value: string) => void;
    setBrand: (value: string) => void;
    setSort: (value: string) => void;
  };
}) {

  const client = useQueryClient();

  const [open, setOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState<ProductPayload>(blankProduct);

  const [message, setMessage] =
    useState("");

  const [useOtherCategory, setUseOtherCategory] =
    useState(false);

  const [otherCategory, setOtherCategory] =
    useState("");



  const save = useMutation({

    mutationFn: async () => {

      let payload = form;


      if (useOtherCategory) {

        const category =
          await catalogApi.createCategory({

            name: otherCategory,

            description: "",

            status: "ACTIVE",

          });


        payload = {

          ...form,

          category_id:
            category.data.id,

        };

      }


      return editing

        ? catalogApi.updateProduct(
            editing.id,
            payload
          )

        : catalogApi.createProduct(
            payload
          );

    },


    onSuccess: () => {

      client.invalidateQueries({
        queryKey: ["products"],
      });

      client.invalidateQueries({
        queryKey: ["categories"],
      });

      client.invalidateQueries({
        queryKey: ["catalog-summary"],
      });


      setOpen(false);

      setEditing(null);

      setForm(blankProduct);

      setUseOtherCategory(false);

      setOtherCategory("");

    },


    onError: (error) => {

      setMessage(
        errorMessage(error)
      );

    },

  });




  const remove = useMutation({

    mutationFn: (id:number) =>
      catalogApi.deleteProduct(id),


    onSuccess: () => {

      client.invalidateQueries({
        queryKey:["products"],
      });


      client.invalidateQueries({
        queryKey:["catalog-summary"],
      });

    },

    onError:(error)=>{

      setMessage(
        errorMessage(error)
      );

    },

  });




  const openForm = (product?: Product) => {

    setMessage("");

    setEditing(product ?? null);

    setUseOtherCategory(false);

    setOtherCategory("");


    setForm(

      product

        ? {

            name: product.name,

            sku: product.sku,

            category_id:
              product.category_id,

            brand:
              product.brand ?? "",

            description:
              product.description ?? "",

            unit_price:
              product.unit_price,

            cost_price:
              product.cost_price,

            stock_quantity:
              product.stock_quantity,

            unit_of_measure:
              product.unit_of_measure,

            status:
              product.status,

          }


        : {

            ...blankProduct,

            category_id:
              categories[0]?.id ?? 0,

          }

    );


    setOpen(true);

  };



  return (

    <Stack spacing={2}>

      <Stack

        direction={{
          xs:"column",
          md:"row",
        }}

        spacing={1}

      >

        <TextField

          label="Search name, SKU or brand"

          value={filters.search}

          onChange={(e)=>
            setFilters.setSearch(
              e.target.value
            )
          }

          fullWidth

        />


        <TextField

          label="Brand"

          value={filters.brand}

          onChange={(e)=>
            setFilters.setBrand(
              e.target.value
            )
          }

        />


        <FormControl sx={{minWidth:150}}>

          <InputLabel>
            Category
          </InputLabel>


          <Select

            label="Category"

            value={filters.categoryId}

            onChange={(e)=>
              setFilters.setCategoryId(
                e.target.value
              )
            }

          >

            <MenuItem value="">
              All
            </MenuItem>


            {
              categories.map((c)=>(

                <MenuItem
                  key={c.id}
                  value={String(c.id)}
                >
                  {c.name}
                </MenuItem>

              ))
            }

          </Select>

        </FormControl>



        <Button
          variant="contained"
          onClick={() => openForm()}
        >
          Add product
        </Button>


      </Stack>





      {message && (

        <Alert severity="error">
          {message}
        </Alert>

      )}





      {error && (

        <Alert severity="error">
          {error}
        </Alert>

      )}






      <Stack spacing={1}>

        {

          loading ? (

            <Typography>
              Loading products...
            </Typography>


          ) : (

            products.map((product)=>(

              <Card
                key={product.id}
                variant="outlined"
              >

                <CardContent>

                  <Typography fontWeight={700}>
                    {product.name}
                  </Typography>


                  <Typography
                    color="text.secondary"
                  >

                    {product.category_name}
                    {" · "}
                    {product.brand || "Unbranded"}
                    {" · ₹"}
                    {product.unit_price}

                  </Typography>


                  <Button
                    size="small"
                    onClick={() =>
                      openForm(product)
                    }
                  >
                    Edit
                  </Button>


                  <Button
                    size="small"
                    color="error"
                    onClick={() =>
                      remove.mutate(product.id)
                    }
                  >
                    Delete
                  </Button>


                </CardContent>

              </Card>

            ))

          )

        }

      </Stack>





      <Dialog

        open={open}

        onClose={() =>
          setOpen(false)
        }

        fullWidth

        maxWidth="sm"

      >

        <DialogTitle>

          {
            editing
              ? "Edit Product"
              : "Add Product"
          }

        </DialogTitle>



        <DialogContent>

          <Grid container spacing={2}>


            <ProductField

              label="Product Name"

              value={form.name}

              onChange={(v)=>
                setForm({
                  ...form,
                  name:v,
                })
              }

            />



            <ProductField

              label="SKU"

              value={form.sku}

              onChange={(v)=>
                setForm({
                  ...form,
                  sku:v,
                })
              }

            />



            <ProductField

              label="Brand"

              value={form.brand}

              onChange={(v)=>
                setForm({
                  ...form,
                  brand:v,
                })
              }

            />



            <ProductField

              label="Unit Price"

              type="number"

              value={
                String(form.unit_price)
              }

              onChange={(v)=>
                setForm({
                  ...form,
                  unit_price:Number(v),
                })
              }

            />



          </Grid>

        </DialogContent>



        <DialogActions>

          <Button
            onClick={() =>
              setOpen(false)
            }
          >
            Cancel
          </Button>


          <Button

            variant="contained"

            onClick={() =>
              save.mutate()
            }

          >
            Save
          </Button>


        </DialogActions>


      </Dialog>


    </Stack>

  );

}




function ProductField({
  label,
  value,
  onChange,
  type="text",
}:{
  label:string;
  value:string;
  onChange:(value:string)=>void;
  type?:string;
}) {


  return (

    <Grid
      size={{
        xs:12,
        sm:6,
      }}
    >

      <TextField

        label={label}

        value={value}

        type={type}

        onChange={(e)=>
          onChange(
            e.target.value
          )
        }

        fullWidth

      />

    </Grid>

  );

}