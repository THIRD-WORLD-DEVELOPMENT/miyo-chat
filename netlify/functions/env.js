export async function handler() {
    return {
        statusCode: 200,
        body: JSON.stringify({
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON: process.env.SUPABASE_ANON
        }),
    };
}
