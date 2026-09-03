import { protocolSnapshot } from "@/lib/bnb-agent";

export async function GET(){
  try{return Response.json(protocolSnapshot())}catch(error){return Response.json({error:error instanceof Error?error.message:"Protocol unavailable"},{status:500})}
}
