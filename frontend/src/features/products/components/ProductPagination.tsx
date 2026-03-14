import { useSearchParams } from "react-router-dom";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export const Pagination = ({ currentPage, totalPages }: PaginationProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const changePage = (page: number) => {
    const params: any = Object.fromEntries(searchParams.entries());
    params.page = page.toString();

    setSearchParams(params);

  };

  return (
    <div className="flex justify-center items-center gap-3 mt-10">
      <button
        disabled={currentPage === 1}
        onClick={() => changePage(currentPage - 1)}
        className="px-4 py-2 border rounded disabled:opacity-50"
      >
        Prev
      </button>
      
      <span className="px-4 py-2">
        Trang {currentPage} / {totalPages}
      </span>

      <button
        disabled={currentPage === totalPages}
        onClick={() => changePage(currentPage + 1)}
        className="px-4 py-2 border rounded disabled:opacity-50"
      >
        Next
      </button>

    </div>

  );

};