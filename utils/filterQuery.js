async function filterQuery(searchParams, fields, Model, sort, andOr = "or") {
  const params = new URLSearchParams(searchParams);

  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 5;

  const sortQuery =
    sort === "low-high"
      ? { price: 1 }
      : sort === "high-low"
      ? { price: -1 }
      : sort === "date-asc"
      ? { createdAt: 1 }
      : { createdAt: -1 };

  const filterQuery = {
    $or: fields.map((field) => {
      return {
        [field]:
          field === "category"
            ? params.get("category")
            : {
                $regex: params.get("query") || "",
                $options: "i",
              },
      };
    }),
  };

  const totalDocuments = await Model.countDocuments(filterQuery);

  const data = await Model.find(filterQuery)
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1))
    .sort(sortQuery);

  return {
    data,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + data.length,
  };
}

module.exports = filterQuery;
