import axios from "axios";

const API_URL = "https://3000-i534jl3mxzt7qnyzhwgjn-022882db.us1.manus.computer/api/trpc/products.add";

async function testAddProduct() {
  try {
    const response = await axios.post(API_URL, {
      json: {
        input: "https://www.morele.net/pamiec-kingston-fury-beast-ddr5-32-gb-5600mhz-cl36-kf556c36bbek2-32-11892219/"
      }
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error:", error.response?.status, error.response?.data || error.message);
  }
}

testAddProduct();
