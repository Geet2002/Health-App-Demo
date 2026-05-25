import React from 'react';

export function PostSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-50">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SinglePostSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-4 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/5"></div>
        </div>
      </div>
      <div className="space-y-3 pt-4">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="flex justify-between items-center pt-6 border-t border-gray-50 mt-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/6"></div>
      </div>
    </div>
  );
}

export function MomentSkeleton() {
  return (
    <div className="space-y-5 animate-pulse mt-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/5"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-64 bg-gray-100 rounded-2xl w-full"></div>
          <div className="flex items-center space-x-4 pt-2">
            <div className="h-8 bg-gray-200 rounded-full w-16"></div>
            <div className="h-8 bg-gray-200 rounded-full w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BloodRequestSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <div key={n} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
          <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-8 h-6 bg-gray-200 rounded-full ml-4"></div>
          </div>
          <div className="px-4 py-4 space-y-3 flex-grow">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
              <div className="h-3 bg-gray-200 rounded w-2/5"></div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded-full w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SingleBloodRequestSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-6 animate-pulse">
      <div className="flex justify-between items-start">
         <div className="space-y-3 flex-1">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
         </div>
         <div className="w-16 h-8 bg-gray-200 rounded-full ml-4"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="h-12 bg-gray-50 rounded-xl border border-gray-100"></div>
        ))}
      </div>
      <div className="space-y-2 pt-4 border-t border-gray-50">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="h-12 bg-gray-200 rounded-2xl w-full mt-4"></div>
    </div>
  );
}

export function CommunityCardSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-4/5"></div>
          </div>
          <div className="pt-3 flex justify-between items-center border-t border-gray-50">
            <div className="flex -space-x-2">
               <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white"></div>
               <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded-full w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto pb-12 pt-4 px-4 sm:px-0 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-20 mb-6"></div>
      
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 rounded-full shrink-0"></div>
          
          <div className="flex-1 w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded w-40"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="h-20 bg-gray-100 rounded-2xl w-full"></div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 space-y-4">
           <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
           </div>
           <div className="h-3 bg-gray-200 rounded-full w-full"></div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 border-t border-gray-100">
           {[1, 2, 3].map(n => (
              <div key={n} className="h-24 bg-gray-50 rounded-2xl flex flex-col items-center justify-center space-y-2 p-4">
                 <div className="h-8 bg-gray-200 rounded w-12"></div>
                 <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="flex p-4 rounded-3xl bg-white border border-gray-100 shadow-sm gap-4 items-start">
          <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0"></div>
          <div className="flex-1 space-y-3 py-1">
             <div className="h-4 bg-gray-200 rounded w-3/4"></div>
             <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
